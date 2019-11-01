import { Action } from "../utils/actions"
import { DateString } from "../utils/dates"

export interface RefreshTablesParams {
  startDate: DateString
}
export interface IrnCrawler {
  start: Action<void, void>
  refreshTables: Action<RefreshTablesParams, void>
  updateIrnPlacesLocation: Action<void, void>
  updateIrnTablesLocation: Action<void, void>
}
