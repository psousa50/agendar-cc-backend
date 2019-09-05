export enum ErrorCodes {
  UNKNOWN = "UNKNOWN",
  BAD_GATEWAY = "BAD_GATEWAY",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  TIMEOUT = "TIMEOUT",
}

export class ServiceError {
  constructor(
    public readonly message: string  | undefined,
    public readonly errorCode: ErrorCodes = ErrorCodes.UNKNOWN,
    public readonly dependencyError: boolean = false,
    public readonly metricValue?: number,
  ) {}
}

export const throwError = (e: ServiceError): void => {
  throw new Error(e.message)
}

export enum LogLevel {
  debug = "debug",
  info = "info",
  warn = "warn",
  error = "error",
}
