import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import * as path from "path"
import { ParseCounties, parseCounties } from "../irnParser/main"
import { Counties, Districts, IrnServices } from "../irnRepository/models"
import { Action, actionOf, ask, toAction } from "../utils/actions"
import { extractText } from "../utils/fetch"
import { getTableParams, IrnTables } from "./models"

const getDistricts: Action<void, Districts> = () => actionOf([])

export const buildGetCounties: (_: ParseCounties) => Action<void, Counties> = injectedParseCounties => () =>
  pipe(
    ask(),
    chain(env => env.fetch(path.join(env.config.irnUrlLocations.irnUrl, env.config.irnUrlLocations.countiesPage))),
    chain(extractText),
    chain(toAction(injectedParseCounties)),
  )
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
