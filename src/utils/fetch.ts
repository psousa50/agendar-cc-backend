import { pipe } from "fp-ts/lib/pipeable"
import { chain, fromTaskEither, ReaderTaskEither, swap } from "fp-ts/lib/ReaderTaskEither"
import { tryCatch } from "fp-ts/lib/TaskEither"
import isoFetch from "isomorphic-fetch"
import { Environment } from "../environment"
import { actionOf, ActionResult } from "./actions"
import { ServiceError } from "./audit"
import { logDebug } from "./debug"
import * as Errors from "./errors"

export type FetchFn = (input: Request | string, init?: RequestInit) => Promise<Response>
export type FetchAction = (
  input: Request | string,
  init?: RequestInit,
) => ReaderTaskEither<Environment, ServiceError, Response>

export const fetchAction = (input: Request | string, init?: RequestInit): ActionResult<Response> => {
  function coreFetch(): ActionResult<Response> {
    logDebug("Fetching... =====>\n", input)
    return fromTaskEither(tryCatch(() => isoFetch(input, init), error => new ServiceError((error as Error).message)))
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
    coreFetch(),
    chain(responseMapper),
  )
}

export const extractText = (response: Response): ActionResult<string> =>
  fromTaskEither(tryCatch(() => response.text(), e => new Errors.BadResponseError((e as Error).message)))
