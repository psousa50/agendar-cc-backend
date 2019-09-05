import { Response, Router } from "express"
import { pipe } from "fp-ts/lib/pipeable"
import { bimap, run } from "fp-ts/lib/ReaderTaskEither"
import { ErrorCodes, ServiceError } from "../../../utils/audit"
import { Environment } from "../../environment"
import { getDistricts, getIrnTables } from "./domain"

const errorHandler = (res: Response) => (error: ServiceError) => {
  res.sendStatus(error.dependencyError ? (error.errorCode === ErrorCodes.NOT_FOUND ? 404 : 502) : 400)
}

const okHandler = (res: Response) => (responseBody: any) => {
  res.contentType("application/json")
  res.status(200)
  res.json(responseBody)
}

export const router = (env: Environment) =>
  Router()
    .get("/districts", async (_, res) => {
      await run(
        pipe(
          getDistricts({}),
          bimap(errorHandler(res), okHandler(res)),
        ),
        env,
      )
    })
    .get("/irnTables", async (_, res) => {
      await run(
        pipe(
          getIrnTables({}),
          bimap(errorHandler(res), okHandler(res)),
        ),
        env,
      )
    })
