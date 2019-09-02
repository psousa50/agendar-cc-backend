import { Action } from "../../../shared/actions"
import { Time } from "../../../shared/models"
import { IrnTable } from "../irnFetch/models"

export type TimeSlot = {
  date: Date
  hours: readonly Time[]
}

export type IrnService = {
  serviceId: number
}
export type IrnServices = IrnService[]

export type District = {
  districtId: number
  districtName: string
}
export type Districts = District[]

export type County = {
  districtId: number
  countyId: number
  countyName: string
}
export type Counties = County[]

export type IrnRepositoryTable = IrnTable
export type IrnRepositoryTables = IrnRepositoryTable[]

export type FindParams = Partial<{
  districtId: number
  countyId: number
  startDate: Date
  endDate: Date
  startTime: Time
  endTime: Time
}>

export interface IrnRepository {
  addCounties: Action<Counties, void>
  addDistricts: Action<Counties, void>
  addIrnServices: Action<Counties, void>
  addIrnTables: Action<IrnRepositoryTables, void>
  clearAll: Action<void, void>
  clearAllTables: Action<void, void>
  getCounties: Action<{ districtId?: number}, Counties>
  getDistricts: Action<void, Districts>
  getServices: Action<void, IrnServices>
  getTables: Action<FindParams, IrnRepositoryTables>
}
