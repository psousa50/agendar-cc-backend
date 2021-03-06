import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Action } from "../src/utils/actions"
import { logDebug } from "../src/utils/debug"

export const rndTo = (max: number) => Math.floor(Math.random() * max)

export const chainLogRTE = <I, R>(m: string, action: Action<I, R>) =>
  chain((v: I) => {
    logDebug(`${m}=>`, v)
    return action(v)
  })
