import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Districts, IrnRepositoryTables } from "../../../irnRepository/models"
import { Action, ask } from "../../../utils/actions"

export const getDistricts: Action<void, Districts> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getDistricts()),
  )

export const getCounties: Action<{ districtId: number | undefined }, Districts> = districtId =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getCounties(districtId)),
  )

export const getIrnTables: Action<{}, IrnRepositoryTables> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnTables({})),
  )
