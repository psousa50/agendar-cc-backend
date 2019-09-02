import { Action } from "../../../shared/actions"
import { Time } from "../../../shared/models"
import { IrnTable } from "../irnFetch/models"

export type TimeSlot = {
  date: Date
  hours: readonly Time[]
}

export type Service = {
  serviceId: number
}
export type Services = Service[]

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
  find: Action<FindParams, IrnRepositoryTables>
  getAll: Action<void, IrnRepositoryTables>
  clearAll: Action<void, IrnRepositoryTables>
  addTables: Action<IrnRepositoryTables, void>
  addDistricts: Action<Counties, void>
  addCounties: Action<Counties, void>
}
