import { Counties } from "../irnRepository/models"
import { Action } from "../utils/actions"
import { DateString } from "../utils/dates"
import { TimeSlot } from "../utils/models"

export type FetchIrnTablesParams = {
  serviceId: number
  districtId: number
  countyId: number
  date?: DateString
}

export type IrnTable = {
  serviceId: number
  districtId: number
  countyId: number
  placeName: string
  tableNumber: string
  address: string
  postalCode: string
  phone: string
  date: DateString
  timeSlots: TimeSlot[]
}
export type IrnTables = IrnTable[]

export interface IrnFetch {
  getIrnTables: Action<FetchIrnTablesParams, IrnTables>
  getCounties: Action<{ districtId: number }, Counties>
}
