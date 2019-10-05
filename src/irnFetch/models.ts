import { Counties } from "../irnRepository/models"
import { Action } from "../utils/actions"
import { TimeSlot } from "../utils/models"

export type GetIrnTableParams = {
  serviceId: number
  districtId: number
  countyId: number
  date?: Date
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
  date: Date
  timeSlots: TimeSlot[]
}
export type IrnTables = IrnTable[]

export interface IrnFetch {
  getIrnTables: Action<GetIrnTableParams, IrnTables>
  getCounties: Action<{ districtId: number }, Counties>
}
