import { IrnFetch } from "../irnFetch/models"
import { IrnRepository } from "../irnRepository/models"
import { AppConfig } from "../utils/config"
import { FetchAction } from "../utils/fetch"

export type Environment = {
  config: AppConfig
  fetch: FetchAction,
  irnFetch: IrnFetch
  irnRepository: IrnRepository
}
