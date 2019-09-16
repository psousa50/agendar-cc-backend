import FormData from "form-data"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../environment"
import { ParseCounties, parseCounties, parseIrnTables, ParseIrnTables, ParseTok, parseTok } from "../irnParser/main"
import { Counties } from "../irnRepository/models"
import { Action, ActionResult, ask, delay, toAction } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { AppConfig } from "../utils/config"
import { extractText } from "../utils/fetch"
import { GetIrnTableParams, IrnTables } from "./models"

export const delayedFetch = (page: string, options?: RequestInit): ActionResult<Response> =>
  pipe(
    ask(),
    chain(env =>
      delay<Environment, ServiceError, Response>(env)(env.config.fetchDelay)(
        env.fetch(`${env.config.irnUrlLocations.irnUrl}/${page}`, options),
      ),
    ),
  )

const getCountiesUrl = (config: AppConfig, districtId: number) =>
  `${config.irnUrlLocations.countiesPage}?id_distrito=${districtId}`

export const buildGetCounties: (
  _: ParseCounties,
) => Action<{ districtId: number }, Counties> = injectedParseCounties => ({ districtId }) =>
  pipe(
    ask(),
    chain(env => delayedFetch(getCountiesUrl(env.config, districtId))),
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
type BuildFormDataParams = (tok: string, params: GetIrnTableParams) => FormDataParam[]
export const buildFormDataParams: BuildFormDataParams = (tok, { serviceId, countyId, date, districtId }) => [
  ["tok", tok],
  ["servico", serviceId.toString()],
  ["distrito", districtId.toString()],
  ["concelho", countyId.toString()],
  ["data_tipo", date ? "outra" : "primeira"],
  ["data", date ? date.toISOString().substr(0, 10) : "2000-01-01"],
  ["sabado_show", "0"],
  ["servico_desc", ""],
  ["concelho_desc", ""],
]

type BuildFormData = (tok: string, params: GetIrnTableParams) => { data: string; boundary: string }
const buildFormData: (_: BuildFormDataParams) => BuildFormData = b => (tok, params) => {
  const data = b(tok, params)

  const formData = new FormData()
  data.forEach(d => formData.append(d[0], d[1]))

  return {
    boundary: formData.getBoundary(),
    data: formData.getBuffer().toString(),
  }
}

type BuildGetIrnTables = (_: ParseTok, __: ParseIrnTables, ___: BuildFormData) => Action<GetIrnTableParams, IrnTables>
export const buildGetIrnTables: BuildGetIrnTables = (
  injectedParseTok,
  injectedParseIrnTables,
  injectedBuildFormData,
) => params => {
  const fetchIrnTablesHtml = (cookies: string[]) => (tok: string) => {
    const formData = injectedBuildFormData(tok, params)
    const options = {
      body: formData.data,
      headers: {
        ["Cookie"]: cookies.join(","),
        ["content-type"]: `multipart/form-data; boundary=${formData.boundary}`,
      },
      method: "POST",
    }

    return pipe(
      ask(),
      chain(env => delayedFetch(getIrnTablesPage(env.config), options)),
      chain(extractText),
    )
  }
  const fetchIrnTables: Action<Response, string> = response => {
    const cookies = extractCookies(response)
    return pipe(
      extractText(response),
      chain(toAction(injectedParseTok)),
      chain(fetchIrnTablesHtml(cookies)),
    )
  }
  return pipe(
    ask(),
    chain(env => delayedFetch(getHomePage(env.config))),
    chain(fetchIrnTables),
    chain(toAction(injectedParseIrnTables(params.serviceId, params.countyId, params.districtId))),
  )
}

const getIrnTables = buildGetIrnTables(parseTok, parseIrnTables, buildFormData(buildFormDataParams))

export const irnFetch = {
  getCounties,
  getIrnTables,
}
