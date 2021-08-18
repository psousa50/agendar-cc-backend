import { pipe } from "fp-ts/lib/pipeable"
import { map } from "fp-ts/lib/TaskEither"
import { MongoClient } from "mongodb"
import { get as getGeoCoding } from "./geoCoding/main"
import { GeoCoding } from "./geoCoding/models"
import { irnFetch } from "./irnFetch/main"
import { IrnFetch } from "./irnFetch/models"
import { irnRepository } from "./irnRepository/main"
import { IrnRepository } from "./irnRepository/models"
import { connect } from "./mongodb/main"
import { config as appConfig, isDev } from "./utils/config"
import { AppConfig } from "./utils/config"
import { FetchAction, fetchAction } from "./utils/fetch"

export enum LogLevel {
  debug = 0,
  info = 1,
  error = 2,
}

const logLevelDescriptions = ["Debug", "Info", "Error"]

export type Environment = {
  config: AppConfig
  dbClient: MongoClient
  fetch: FetchAction
  geoCoding: GeoCoding
  irnFetch: IrnFetch
  irnRepository: IrnRepository
  log: (message: string, level?: LogLevel) => void
  now: () => number
}

export const buildEnvironment = () => {
  const config = appConfig.get()

  const log = (c: AppConfig) => (message: string, level: LogLevel = LogLevel.info) => {
    if (isDev(c) || level > LogLevel.info) {
      console.log(`${logLevelDescriptions[level]}: ${message}`)
    }
  }

  const mongoUri = process.env.MONGODB_URI || config.mongodb.uri || ""
  return pipe(
    connect(mongoUri),
    map(mongoClient => ({
      config,
      dbClient: mongoClient,
      fetch: fetchAction,
      geoCoding: {
        get: getGeoCoding,
      },
      irnFetch,
      irnRepository,
      log: log(config),
      now: Date.now,
    })),
  )
}
