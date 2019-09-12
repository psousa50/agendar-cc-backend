import { pipe } from "fp-ts/lib/pipeable"
import { map } from "fp-ts/lib/TaskEither"
import { MongoClient } from "mongodb"
import { irnFetch as irnFetchLocal } from "./irnFetch/local"
import { irnFetch } from "./irnFetch/main"
import { IrnFetch } from "./irnFetch/models"
import { irnRepository as irnRepositoryLocal } from "./irnRepository/local"
import { irnRepository } from "./irnRepository/main"
import { IrnRepository } from "./irnRepository/models"
import { connect } from "./mongodb/main"
import { config as appConfig, isDev } from "./utils/config"
import { AppConfig } from "./utils/config"
import { FetchAction, fetchAction } from "./utils/fetch"

export type Environment = {
  config: AppConfig
  fetch: FetchAction
  irnFetch: IrnFetch
  irnRepository: IrnRepository
  dbClient: MongoClient
}

export const buildEnvironment = () => {
  const config = appConfig.get()

  const mongoUri = process.env.MONGODB_URI || config.mongodb.uri || ""
  return pipe(
    connect(mongoUri),
    map(mongoClient => ({
      config,
      dbClient: mongoClient,
      fetch: fetchAction,
      irnFetch: isDev(config) ? irnFetchLocal : irnFetch,
      irnRepository: config.infra.useMemoryRepository ? irnRepositoryLocal : irnRepository,
    })),
  )
}
