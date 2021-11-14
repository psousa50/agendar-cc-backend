import { Response, Router } from "express"
import { pipe } from "fp-ts/lib/function"
import { bimap } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../../../environment"
import { ErrorCodes, ServiceError } from "../../../utils/audit"
import { LogLevel } from "../../../utils/config"
import { getCounties, getDistricts, getIrnPlaces, getIrnTableMatch, getIrnTables, getServices } from "./domain"
import {
  transformGetCountiesParams,
  transformGetIrnPlacesParams,
  transformGetIrnTableMatchParams,
  transformGetIrnTablesParams,
} from "./transformers"

const errorHandler = (res: Response) => (error: ServiceError) => {
  res.sendStatus(error.dependencyError ? (error.errorCode === ErrorCodes.NOT_FOUND ? 404 : 502) : 400)
}

const okHandler = (res: Response) => (responseBody: any) => {
  res.contentType("application/json")
  res.status(200)
  res.json(responseBody)
}

const logQuery = (env: Environment, service: string, query: any) => {
  env.log(`GET ${service}=====>\n ${JSON.stringify(query)}`, LogLevel.debug)
}

export const router = (env: Environment) =>
  Router()
    .get("/irnServices", async (req, res) => {
      logQuery(env, "irnServices", req.query)
      await pipe(getServices(), bimap(errorHandler(res), okHandler(res)))(env)()
    })
    .get("/districts", async (req, res) => {
      logQuery(env, "districts", req.query)
      await pipe(getDistricts(), bimap(errorHandler(res), okHandler(res)))(env)()
    })
    .get("/counties/", async (req, res) => {
      logQuery(env, "counties", req.query)
      await pipe(getCounties(transformGetCountiesParams(req.query)), bimap(errorHandler(res), okHandler(res)))(env)()
    })
    .get("/irnPlaces", async (req, res) => {
      logQuery(env, "irnPlaces", req.query)
      await pipe(getIrnPlaces(transformGetIrnPlacesParams(req.query)), bimap(errorHandler(res), okHandler(res)))(env)()
    })
    .get("/irnTables", async (req, res) => {
      logQuery(env, "irnTables", req.query)
      await pipe(getIrnTables(transformGetIrnTablesParams(req.query)), bimap(errorHandler(res), okHandler(res)))(env)()
    })
    .get("/irnTableMatch", async (req, res) => {
      logQuery(env, "irnTableMatch", req.query)
      await pipe(
        getIrnTableMatch(transformGetIrnTableMatchParams(req.query)),
        bimap(errorHandler(res), okHandler(res)),
      )(env)()
    })
