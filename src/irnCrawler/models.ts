import { Action } from "../utils/actions"

export interface RefreshTablesParams {
  startDate: Date
}
export interface IrnCrawler {
  start: Action<void, void>
  refreshTables: Action<RefreshTablesParams, void>
  updateIrnPlacesLocation: Action<void, void>
}
