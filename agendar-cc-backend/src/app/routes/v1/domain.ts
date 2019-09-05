import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Districts, IrnRepositoryTables } from "../../../irnRepository/models"
import { Action, ask } from "../../../utils/actions"

export const getDistricts: Action<{}, Districts> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getDistricts()),
  )

export const getIrnTables: Action<{}, IrnRepositoryTables> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnTables({})),
  )
