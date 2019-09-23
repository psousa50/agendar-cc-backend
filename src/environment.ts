import { pipe } from "fp-ts/lib/pipeable"
import { map } from "fp-ts/lib/TaskEither"
import { MongoClient } from "mongodb"
import { get as getGeoCoding } from "./geoCoding/main"
import { GeoCoding } from "./geoCoding/models"
import { irnFetch as irnFetchLocal } from "./irnFetch/local"
import { irnFetch } from "./irnFetch/main"
import { IrnFetch } from "./irnFetch/models"
import { irnRepository as irnRepositoryLocal } from "./irnRepository/local"
import { irnRepository } from "./irnRepository/main"
import { IrnRepository } from "./irnRepository/models"
import { connect } from "./mongodb/main"
import { config as appConfig } from "./utils/config"
import { AppConfig } from "./utils/config"
import { FetchAction, fetchAction } from "./utils/fetch"

export type Environment = {
  config: AppConfig
  fetch: FetchAction
  irnFetch: IrnFetch
  irnRepository: IrnRepository
  dbClient: MongoClient
  geoCoding: GeoCoding
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
      geoCoding: {
        get: getGeoCoding,
      },
      irnFetch: config.infra.useLocalIrnTables ? irnFetchLocal : irnFetch,
      irnRepository: config.infra.useMemoryRepository ? irnRepositoryLocal : irnRepository,
    })),
  )
}
