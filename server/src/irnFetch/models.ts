import { Action } from "../../../shared/actions"
import { Time } from "../../../shared/models"
import { Counties, County, IrnServices } from "../irnRepository/models"

export type FindParams = {
  serviceId: number
  county: County
  date?: Date
}

export type IrnTable = {
  serviceId: number,
  county: County
  locationName: string
  tableNumber: string
  address: string
  postalCode: string
  phone: string
  date: Date
  times: Time[]
}
export type IrnTables = IrnTable[]

export interface IrnFetch {
  getIrnTables: Action<FindParams, IrnTables>
  getCounties: Action<void, Counties>
  getIrnServices: Action<void, IrnServices>
}
