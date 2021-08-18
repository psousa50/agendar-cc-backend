import FormData from "form-data"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../environment"
import { ParseCounties, parseCounties, parseIrnTables, ParseIrnTables, ParseTok, parseTok } from "../irnParser/main"
import { Counties } from "../irnRepository/models"
import { Action, actionOf, ask, delay, toAction } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { AppConfig, LogLevel } from "../utils/config"
import { delayedFetch, extractCookies, extractText } from "../utils/fetch"
import { FetchIrnTablesParams, IrnTables } from "./models"

export const fetchIrnPage = (page: string, options?: RequestInit) =>
  pipe(
    ask(),
    chain(env => delayedFetch(env.config.fetchDelay)(`${env.config.irnUrlLocations.irnUrl}/${page}`, options)),
  )

const getCountiesUrl = (config: AppConfig, districtId: number) =>
  `${config.irnUrlLocations.countiesPage}?id_distrito=${districtId}`

export const buildGetCounties: (
  _: ParseCounties,
) => Action<{ districtId: number }, Counties> = injectedParseCounties => ({ districtId }) =>
  pipe(
    ask(),
    chain(env => fetchIrnPage(getCountiesUrl(env.config, districtId))),
    chain(extractText),
    chain(toAction(injectedParseCounties(districtId))),
  )

const getCounties = buildGetCounties(parseCounties)

const getHomePage = (config: AppConfig) => `${config.irnUrlLocations.homePage}`
const getIrnTablesPage = (config: AppConfig) => `${config.irnUrlLocations.irnTablesPage}`

type FormDataParam = [string, string]
interface BuildFormDataParamsDescriptions {
  county?: string
  irnService?: string
}
type BuildFormDataParams = (
  tok: string,
  params: FetchIrnTablesParams,
  descriptions: BuildFormDataParamsDescriptions,
) => FormDataParam[]
export const buildFormDataParams: BuildFormDataParams = (
  tok,
  { serviceId, countyId, date, districtId },
  { county, irnService },
) => [
  ["tok", tok],
  ["servico", serviceId.toString()],
  ["distrito", districtId.toString()],
  ["concelho", countyId.toString()],
  ["data_tipo", date ? "outra" : "primeira"],
  ["data", date ? date : "2000-01-01"],
  ["sabado_show", "0"],
  ["servico_desc", irnService || "servico_desc"],
  ["concelho_desc", county || "concelho_desc"],
]

type BuildFormData = (
  tok: string,
  params: FetchIrnTablesParams,
  descriptions: BuildFormDataParamsDescriptions,
) => { data: string; boundary: string }
const buildFormData: (_: BuildFormDataParams) => BuildFormData = buildParams => (tok, params, descriptions) => {
  const data = buildParams(tok, params, descriptions)

  const formData = new FormData()
  data.forEach(d => formData.append(d[0], d[1]))

  return {
    boundary: formData.getBoundary(),
    data: formData.getBuffer().toString(),
  }
}

interface FetchIrnTablesOptions {
  body: string
  headers: {}
  method: string
}

interface BuildGetIrnTablesResponseParams {
  params: FetchIrnTablesParams
  descriptions: BuildFormDataParamsDescriptions
}
type BuildGetIrnTablesResponse = (_: ParseTok, __: BuildFormData) => Action<BuildGetIrnTablesResponseParams, Response>
export const buildGetIrnTablesResponse: BuildGetIrnTablesResponse = (injectedParseTok, injectedBuildFormData) => ({
  params,
  descriptions,
}) => {
  const buildOptions = (cookies: string[]) => (tok: string) => {
    const formData = injectedBuildFormData(tok, params, descriptions)
    const options = {
      body: formData.data,
      headers: {
        ["Cookie"]: cookies.join(","),
        ["content-type"]: `multipart/form-data; boundary=${formData.boundary}`,
      },
      method: "POST",
    }

    return actionOf(options)
  }
  const getIrnTablesOptions: Action<Response, FetchIrnTablesOptions> = response => {
    const cookies = extractCookies(response)
    return pipe(
      extractText(response),
      chain(toAction(injectedParseTok)),
      chain(buildOptions(cookies)),
    )
  }

  const fetchIrnTablesHtml = (options: FetchIrnTablesOptions) =>
    pipe(
      ask(),
      chain(env => fetchIrnPage(getIrnTablesPage(env.config), options)),
    )

  return pipe(
    ask(),
    chain(env => fetchIrnPage(getHomePage(env.config))),
    chain(getIrnTablesOptions),
    chain(fetchIrnTablesHtml),
  )
}

type BuildGetIrnTablesHtml = (_: ParseTok, __: BuildFormData) => Action<BuildGetIrnTablesResponseParams, string>
export const buildGetIrnTablesHtml: BuildGetIrnTablesHtml = (injectedParseTok, injectedBuildFormData) => params =>
  pipe(
    buildGetIrnTablesResponse(injectedParseTok, injectedBuildFormData)(params),
    chain(extractText),
  )

type BuildGetIrnTables = (
  _: ParseTok,
  __: BuildFormData,
  ___: ParseIrnTables,
) => Action<FetchIrnTablesParams, IrnTables>
export const buildGetIrnTables: BuildGetIrnTables = (
  injectedParseTok,
  injectedBuildFormData,
  injectedParseIrnTables,
) => params => {
  const tryParseIrnTables: Action<number, IrnTables> = counter => {
    return pipe(
      ask(),
      chain(env => {
        if (counter >= env.config.maxNoServiceFetchRetries) {
          env.log("NOT Recovered.", LogLevel.info)
          return actionOf([])
        } else {
          return pipe(
            buildGetIrnTablesHtml(injectedParseTok, injectedBuildFormData)({ params, descriptions: {} }),
            chain(html => {
              const parsedTables = injectedParseIrnTables(env)(params.serviceId, params.countyId, params.districtId)(
                html,
              )
              if (parsedTables) {
                if (counter > 0) {
                  env.log("Recovered.", LogLevel.info)
                }
                return actionOf(parsedTables)
              } else {
                if (counter === 0) {
                  env.log(`Invalid response for (${JSON.stringify(params)}), retrying...`, LogLevel.info)
                }
                return delay<Environment, ServiceError, IrnTables>(env)(env.config.maxNoServiceFetchDelay)(
                  tryParseIrnTables(counter + 1),
                )
              }
            }),
          )
        }
      }),
    )
  }

  return tryParseIrnTables(0)
}

export const getIrnTablesResponse = buildGetIrnTablesResponse(parseTok, buildFormData(buildFormDataParams))

export const getIrnTablesHtml = buildGetIrnTablesHtml(parseTok, buildFormData(buildFormDataParams))

const getIrnTables = buildGetIrnTables(parseTok, buildFormData(buildFormDataParams), parseIrnTables)

export const irnFetch = {
  getCounties,
  getIrnTables,
}
