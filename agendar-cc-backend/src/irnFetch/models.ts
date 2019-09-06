import { Counties, County, Districts, IrnServices } from "../irnRepository/models"
import { Action } from "../utils/actions"

type Time = string

export type getTableParams = {
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
  getIrnTables: Action<getTableParams, IrnTables>
  getCounties: Action<{districtId: number}, Counties>
  getDistricts: Action<void, Districts>
  getIrnServices: Action<void, IrnServices>
}
