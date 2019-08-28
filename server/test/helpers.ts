import { chain } from "fp-ts/lib/ReaderTaskEither"
import { Action } from "../../shared/actions"

export const rndTo = (max: number) => Math.floor(Math.random() * max)

export const chainLogRTE = <I, R>(m: string, action: Action<I, R>) => chain((v: I) => {
  console.log(`${m}=>`, v)
  return action(v)
})
