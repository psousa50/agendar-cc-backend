import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { ask, delay } from "../utils/actions"

export const fetchWrapper = (page: string, options?: RequestInit) =>
  pipe(
    ask(),
    chain(env => delay(env)(env.config.fetchDelay)(env.fetch(`${env.config.irnUrlLocations.irnUrl}/${page}`, options))),
  )
