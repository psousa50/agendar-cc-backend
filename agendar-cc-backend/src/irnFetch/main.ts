import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../app/environment"
import { ParseCounties, parseCounties } from "../irnParser/main"
import { Counties, Districts, IrnServices } from "../irnRepository/models"
import { Action, actionOf, ActionResult, ask, delay, toAction } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { AppConfig } from "../utils/config"
import { extractText } from "../utils/fetch"
import { getTableParams, IrnTables } from "./models"

export const delayedFetch = (page: string, options?: RequestInit): ActionResult<Response> =>
  pipe(
    ask(),
    chain(env =>
      delay<Environment, ServiceError, Response>(env)(env.config.fetchDelay)(
        env.fetch(`${env.config.irnUrlLocations.irnUrl}/${page}`, options),
      ),
    ),
  )

const getDistricts: Action<void, Districts> = () => actionOf([])

const getCountiesUrl = (config: AppConfig, districtId: number) =>
  `${config.irnUrlLocations.countiesPage}?id_distrito=${districtId}`

export const buildGetCounties: (
  _: ParseCounties,
) => Action<{ districtId: number }, Counties> = injectedParseCounties => ({ districtId }) => {
  console.log("buildGetCounties=====>\n")
  return pipe(
    ask(),
    chain(env => delayedFetch(getCountiesUrl(env.config, districtId))),
    chain(extractText),
    chain(toAction(injectedParseCounties(districtId))),
  )
}

const getCounties = buildGetCounties(parseCounties)

const getIrnTables: Action<getTableParams, IrnTables> = _ => {
  return actionOf([])
}

const getIrnServices: Action<void, IrnServices> = _ => {
  return actionOf([])
}

export const irnFetch = {
  getCounties,
  getDistricts,
  getIrnServices,
  getIrnTables,
}
