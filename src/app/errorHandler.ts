import { ErrorRequestHandler, RequestHandler } from "express"

export function createErrorHandler(): ErrorRequestHandler {
  return (_, __, res) => {
    res.sendStatus(500)
  }
}

export function createNotFoundHandler(): RequestHandler {
  return (_, res) => {
    res.sendStatus(404)
  }
}
