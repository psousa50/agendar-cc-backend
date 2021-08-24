import { pipe } from "fp-ts/lib/function"
import { chain, fold, fromTaskEither, ReaderTaskEither, swap } from "fp-ts/lib/ReaderTaskEither"
import { tryCatch } from "fp-ts/lib/TaskEither"
import isoFetch from "isomorphic-fetch"
import { Environment } from "../environment"
import { actionErrorOf, actionOf, ActionResult, ask, delay } from "./actions"
import { ServiceError } from "./audit"
import * as Errors from "./errors"

export type FetchPromise = (input: Request | string, init?: RequestInit) => Promise<Response>
export type FetchAction = (
  input: Request | string,
  init?: RequestInit,
) => ReaderTaskEither<Environment, ServiceError, Response>

export const buildFetchAction = (fetch: FetchPromise) => (
  input: Request | string,
  init?: RequestInit,
): ActionResult<Response> => {
  const coreFetch: () => ActionResult<Response> = () =>
    fromTaskEither(tryCatch(() => fetch(input, init), error => new ServiceError((error as Error).message)))

  const fetchRetry = (nTries: number = 1): ActionResult<Response> => {
    // logDebug(`Fetching... ( Tries: ${nTries})`, input, new Date(Date.now()))
    return pipe(
      ask(),
      chain(env =>
        pipe(
          coreFetch(),
          fold(
            e => {
              env.log(`Error Fetching ${e.message}. ${nTries < env.config.retryCount ? "Retrying..." : ""}`)
              return nTries < env.config.retryCount
                ? delay<Environment, ServiceError, Response>(env)(env.config.retryDelay)(fetchRetry(nTries + 1))
                : actionErrorOf(e)
            },
            r => actionOf(r),
          ),
        ),
      ),
    )
  }

  function defaultErrorHandler(response: Response, message?: string): ServiceError {
    switch (response.status) {
      case 400:
        return new Errors.BadRequestError(message)
      case 401:
        return new Errors.UnAuthorised(message)
      case 403:
        return new Errors.ForbiddenError(message)
      case 404:
        return new Errors.NotFoundError(message)
      case 500:
        return new Errors.NotOkError(message)
      case 502:
        return new Errors.BadGatewayError(message)
      case 503:
        return new Errors.ServiceUnavailableError(message)
      default:
        return new Errors.HttpError(response.status, message)
    }
  }

  async function errorMessage(response: Response): Promise<ServiceError> {
    return response
      .text()
      .then(body => body || response.statusText)
      .catch(() => response.statusText)
      .then(msg => defaultErrorHandler(response, msg))
  }

  function responseMapper(response: Response): ActionResult<Response> {
    if (response.ok) {
      return actionOf(response)
    } else {
      return pipe(
        fromTaskEither(tryCatch(() => errorMessage(response), () => response)),
        swap,
      )
    }
  }

  return pipe(
    fetchRetry(),
    chain(responseMapper),
  )
}

export const extractText = (response: Response): ActionResult<string> =>
  fromTaskEither(tryCatch(() => response.text(), e => new Errors.BadResponseError((e as Error).message)))

export const extractCookies = (response: Response) => {
  let cookies: string[] = []
  response.headers.forEach((v, k) => {
    if (k === "set-cookie") {
      cookies = [...cookies, v]
    }
  })

  return cookies
}

export const extractJson = (response: Response): ActionResult<any> =>
  fromTaskEither(tryCatch(() => response.json(), e => new Errors.BadResponseError((e as Error).message)))

export const delayedFetch = (delayMs: number) => (url: string, options?: RequestInit): ActionResult<Response> =>
  pipe(
    ask(),
    chain(env => delay<Environment, ServiceError, Response>(env)(delayMs)(env.fetch(url, options))),
  )

export const fetchAction = buildFetchAction(isoFetch)
