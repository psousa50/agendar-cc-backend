import { Counties, County, IrnService } from "../irnRepository/models"
import { Action } from "../utils/actions"

type Time = string

export type GetTableParams = {
  service: IrnService
  county: County
  date?: Date
}

export type IrnTable = {
  serviceId: number
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
  getIrnTables: Action<GetTableParams, IrnTables>
  getCounties: Action<{ districtId: number }, Counties>
}
