import { Action } from "../../../shared/actions"

interface IrnCrawlerParams {
  startDate: Date
}
export interface IrnCrawler {
  start: Action<IrnCrawlerParams, void>
}
