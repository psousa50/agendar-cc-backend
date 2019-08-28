import { Action } from "../../../shared/actions"
import { Time } from "../../../shared/models"
import { Counties, County } from "../irnRepository/models"

export type FindParams = {
  county: County
  date?: Date
}

export type IrnTable = {
  county: County
  locationName: string
  tableNumber: number
  address: string
  date: Date
  times: Time[]
}
export type IrnTables = IrnTable[]

export interface IrnFetch {
  find: Action<FindParams, IrnTables>
  getCounties: Action<void, Counties>
}
