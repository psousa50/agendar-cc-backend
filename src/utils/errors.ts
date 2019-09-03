import { ServiceError } from "./audit"

// tslint:disable:max-classes-per-file
export class ResponseError extends ServiceError { }
export class BadGatewayError extends ResponseError { }
export class BadRequestError extends ResponseError { }
export class BadResponseError extends ResponseError { }
export class ConnectionError extends ResponseError { }
export class ForbiddenError extends ResponseError { }
export class NotFoundError extends ResponseError { }
export class NotOkError extends ResponseError { }
export class ServiceUnavailableError extends ResponseError { }
export class UnAuthorised extends ResponseError { }
export class HttpError extends ResponseError {
  public status?: number

  constructor(message: string)
  constructor(status: number, message?: string)
  constructor(statusOrMessage: number | string, message?: string) {
    super(typeof statusOrMessage === "string" ? statusOrMessage : message)
    this.status = typeof statusOrMessage === "string" ? undefined : statusOrMessage
  }
}
// tslint:enable:max-classes-per-file
