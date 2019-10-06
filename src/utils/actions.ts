import { fold, left, right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { ask as askReader, reader } from "fp-ts/lib/Reader"

import {
  chain,
  fromEither,
  fromTaskEither,
  map,
  ReaderTaskEither,
  readerTaskEither as RTE,
  rightReader,
} from "fp-ts/lib/ReaderTaskEither"
import { tryCatch } from "fp-ts/lib/TaskEither"
import { Environment } from "../environment"
import { ServiceError } from "./audit"
import { logDebug } from "./debug"

export type ActionResult<R = void> = ReaderTaskEither<Environment, ServiceError, R>
export type Action<I = void, R = void> = (i: I) => ActionResult<R>

// tslint:disable:max-line-length
// prettier-ignore
export function pipeActions<A1, A2, A3>(f1: Action<A1, A2>, f2: Action<A2, A3>): Action<A1, A3>
// prettier-ignore
export function pipeActions<A1, A2, A3, A4>(f1: Action<A1, A2>, f2: Action<A2, A3>, f3: Action<A3, A4>): Action<A1, A4>
// prettier-ignore
export function pipeActions<A1, A2, A3, A4, A5>(f1: Action<A1, A2>, f2: Action<A2, A3>, f3: Action<A3, A4>, f4: Action<A4, A5>): Action<A1, A5>
// prettier-ignore
export function pipeActions<A1, A2, A3, A4, A5, A6>(f1: Action<A1, A2>, f2: Action<A2, A3>, f3: Action<A3, A4>, f4: Action<A4, A5>, f5: Action<A5, A6>): Action<A1, A6>
// prettier-ignore
export function pipeActions<A1, A2, A3, A4, A5, A6, A7>(f1: Action<A1, A2>, f2: Action<A2, A3>, f3: Action<A3, A4>, f4: Action<A4, A5>, f5: Action<A5, A6>, f6: Action<A6, A7>): Action<A1, A7>
// prettier-ignore
export function pipeActions<A1, A2, A3, A4, A5, A6, A7, A8>(f1: Action<A1, A2>, f2: Action<A2, A3>, f3: Action<A3, A4>, f4: Action<A4, A5>, f5: Action<A5, A6>, f6: Action<A6, A7>, f7: Action<A7, A8>): Action<A1, A8>
// prettier-ignore
export function pipeActions(...fs: Action[]): Action {
  return a => fs.reduce((acc, f) => RTE.chain(acc, f), rightReader<Environment, ServiceError, any>(reader.of(a)))
}
// prettier-ignore-end
// tslint:disable:max-line-length

export const ask = () => rightReader<Environment, ServiceError, Environment>(askReader<Environment>())

export const delay = <E, A, R>(env: E) => (
  millis: number,
): ((rte: ReaderTaskEither<E, A, R>) => ReaderTaskEither<E, A, R>) => rte => {
  const promiseDelay = new Promise<R>((resolve, reject) => {
    setTimeout(() => {
      rte(env)().then(fold(reject, resolve))
    }, millis)
  })

  return fromTaskEither(tryCatch(() => promiseDelay, e => e as A))
}

export const actionOf = <R>(v: R): ActionResult<R> => fromEither(right(v))
export function actionErrorOf<R>(error: ServiceError): ActionResult<R> {
  return fromEither(left<ServiceError, R>(error))
}

export const toAction = <I, R>(f: (i: I) => R): ((i: I) => ActionResult<R>) => i => {
  try {
    return actionOf(f(i))
  } catch (error) {
    return fromEither(left(error))
  }
}

export const fromPromise = <T>(promise: (env: Environment) => Promise<T>) =>
  pipe(
    ask(),
    chain(env =>
      fromTaskEither(
        tryCatch(
          () => promise(env),
          e => {
            logDebug(`ERROR: ${(e as Error).message}`)
            return new ServiceError((e as Error).message)
          },
        ),
      ),
    ),
  )

export const fromVoidPromise = <T>(promise: (env: Environment) => Promise<T>) =>
  pipe(
    fromPromise(env => promise(env)),
    chain(() => actionOf(undefined)),
  )

export const pipeActionsInSequence = <T>(collection: T[]) => (action: Action<T, void>) =>
  collection.reduceRight(
    (acc, cur) =>
      pipe(
        action(cur),
        chain(() => acc),
      ),
    actionOf(undefined),
  )

export function mapActionsInSequence<T, R>(collection: T[]) {
  return (action: Action<T, R>) =>
    collection.reduceRight(
      (acc, cur) =>
        pipe(
          action(cur),
          chain(value =>
            pipe(
              acc,
              map(values => [...values, value]),
            ),
          ),
        ),
      actionOf([] as R[]),
    )
}
