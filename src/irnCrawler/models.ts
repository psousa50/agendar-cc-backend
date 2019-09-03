import { Action } from "../utils/actions"

interface IrnCrawlerParams {
  startDate: Date
}
export interface IrnCrawler {
  start: Action<IrnCrawlerParams, void>
}
