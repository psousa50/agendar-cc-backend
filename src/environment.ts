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
import { config as appConfig, LogLevel, logLevelDescriptions } from "./utils/config"
import { AppConfig } from "./utils/config"
import { FetchAction, fetchAction } from "./utils/fetch"

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
    if (level >= c.logLevel) {
      console.log(`${logLevelDescriptions(level)}: ${message}`)
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
