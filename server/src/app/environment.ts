import { AppConfig } from "../../../shared/config"
import { IrnFetch } from "../irnFetch/models"
import { IrnRepository } from "../irnRepository/models"

export type Environment = {
  config: AppConfig
  irnFetch: IrnFetch
  irnRepository: IrnRepository
}
