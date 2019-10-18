import FormData from "form-data"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { ParseCounties, parseCounties, parseIrnTables, ParseIrnTables, ParseTok, parseTok } from "../irnParser/main"
import { Counties } from "../irnRepository/models"
import { Action, actionOf, ask, toAction } from "../utils/actions"
import { AppConfig } from "../utils/config"
import { delayedFetch, extractText } from "../utils/fetch"
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

const extractCookies = (response: Response) => {
  let cookies: string[] = []
  response.headers.forEach((v, k) => {
    if (k === "set-cookie") {
      cookies = [...cookies, v]
    }
  })

  return cookies
}

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
  ["data", date ? date.toISOString().substr(0, 10) : "2000-01-01"],
  ["sabado_show", "0"],
  ["servico_desc", irnService || ""],
  ["concelho_desc", county || ""],
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

interface BuildGetIrnTablesHtmlParams {
  params: FetchIrnTablesParams
  descriptions: BuildFormDataParamsDescriptions
}
type BuildGetIrnTablesHtml = (_: ParseTok, __: BuildFormData) => Action<BuildGetIrnTablesHtmlParams, string>
export const buildGetIrnTablesHtml: BuildGetIrnTablesHtml = (injectedParseTok, injectedBuildFormData) => ({
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
      chain(extractText),
    )

  return pipe(
    ask(),
    chain(env => fetchIrnPage(getHomePage(env.config))),
    chain(getIrnTablesOptions),
    chain(fetchIrnTablesHtml),
  )
}

type BuildGetIrnTables = (
  _: ParseTok,
  __: BuildFormData,
  ___: ParseIrnTables,
) => Action<FetchIrnTablesParams, IrnTables>
export const buildGetIrnTables: BuildGetIrnTables = (
  injectedParseTok,
  injectedBuildFormData,
  injectedParseIrnTables,
) => params =>
  pipe(
    buildGetIrnTablesHtml(injectedParseTok, injectedBuildFormData)({ params, descriptions: {} }),
    chain(toAction(injectedParseIrnTables(params.serviceId, params.countyId, params.districtId))),
  )

export const getIrnTablesHtml = buildGetIrnTablesHtml(parseTok, buildFormData(buildFormDataParams))

const getIrnTables = buildGetIrnTables(parseTok, buildFormData(buildFormDataParams), parseIrnTables)

export const irnFetch = {
  getCounties,
  getIrnTables,
}
