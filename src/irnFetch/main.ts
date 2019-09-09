import FormData from "form-data"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../app/environment"
import { ParseCounties, parseCounties, parseIrnTables, ParseIrnTables, ParseTok, parseTok } from "../irnParser/main"
import { Counties } from "../irnRepository/models"
import { Action, ActionResult, ask, delay, toAction } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { AppConfig } from "../utils/config"
import { extractText } from "../utils/fetch"
import { GetTableParams, IrnTables } from "./models"

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

type BuildFormData = (tok: string, params: GetTableParams) => { data: string; boundary: string }
const buildFormData: BuildFormData = (tok, { service, county, date }) => {
  const data = [
    ["tok", tok],
    ["servico", service.serviceId.toString()],
    ["distrito", county.districtId.toString()],
    ["concelho", county.countyId.toString()],
    ["data_tipo", "primeira"],
    ["data", date ? date.toISOString().substr(0, 10) : "2019-09-08"],
    ["sabado_show", "0"],
    ["servico_desc", "Pedido / Renovação de Cartão de Cidadão"],
    ["concelho_desc", "LISBOA"],
  ]

  const formData = new FormData()
  data.forEach(d => formData.append(d[0], d[1]))

  return {
    boundary: formData.getBoundary(),
    data: formData.getBuffer().toString(),
  }
}

type BuildGetIrnTables = (_: ParseTok, __: ParseIrnTables, ___: BuildFormData) => Action<GetTableParams, IrnTables>

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
        "Cookie": cookies.join(","),
        "content-type": `multipart/form-data; boundary=${formData.boundary}`,
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
    chain(toAction(injectedParseIrnTables(params.service, params.county))),
  )
}

const getIrnTables = buildGetIrnTables(parseTok, parseIrnTables, buildFormData)

export const irnFetch = {
  getCounties,
  getIrnTables,
}
