import { irnFetch } from "./irnFetch/main"
import { IrnFetch } from "./irnFetch/models"
import { irnRepository } from "./irnRepository/main"
import { IrnRepository } from "./irnRepository/models"
import { irnFetchLocal } from "./local/irnFetch"
import { AppConfig } from "./utils/config"
import { config as appConfig, isDev } from "./utils/config"
import { FetchAction, fetchAction } from "./utils/fetch"

export type Environment = {
  config: AppConfig
  fetch: FetchAction
  irnFetch: IrnFetch
  irnRepository: IrnRepository
}

export const buildEnvironment: () => Environment = () => {
  const config = appConfig.get()
  return {
    config,
    fetch: fetchAction,
    irnFetch: isDev(config) ? irnFetchLocal : irnFetch,
    irnRepository,
  }
}
