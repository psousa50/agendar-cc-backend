import { Action } from "../utils/actions"
import { GpsLocation } from "../utils/models"

export interface GeoCoding {
  get: Action<string, GpsLocation>
}
