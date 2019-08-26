import { Action } from "../../../shared/actions"

export type Time = string

export type TimeSlot = {
  date: Date
  hours: readonly Time[]
}

export type County = {
  districtId: number
  countyId: number
}
export type Counties =  County[]

export type IrnTable = {
  county: County
  name: string
  tableNumber: number
  address: string
  availableSlots: readonly TimeSlot[]
}
export type IrnTables = IrnTable[]

export type FindParams = Partial<{
  districtId: number
  countyId: number
  startDate: Date
  endDate: Date
  startTime: Time
  endTime: Time
}>

export interface IrnRepository {
  find: Action<FindParams, IrnTables>
  getAll: Action<void, IrnTables>
  clearAll: Action<void, IrnTables>
  addTables: Action<IrnTables, void>
}
