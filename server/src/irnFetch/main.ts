import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import * as path from "path"
import { Action, actionOf, ask, toAction } from "../../../shared/actions"
import { ParseCounties } from "../irnParser/main"
import { Counties } from "../irnRepository/models"
import { extractText } from "../utils/fetch"
import { FindParams, IrnTables } from "./models"

export const getTables: Action<FindParams, IrnTables> = _ => {
  return actionOf([])
}

export const getCounties: (parseCounties: ParseCounties) => Action<void, Counties> = parseCounties => () =>
  pipe(
    ask(),
    chain(env => env.fetch(path.join(env.config.irnUrlLocations.irnUrl, env.config.irnUrlLocations.countiesPage))),
    chain(extractText),
    chain(toAction(parseCounties)),
  )
