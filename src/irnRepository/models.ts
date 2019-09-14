import { IrnTable } from "../irnFetch/models"
import { DbConfig } from "../mongodb/main"
import { Action } from "../utils/actions"

type Time = string

export type TimeSlot = {
  date: Date
  hours: readonly Time[]
}

export type IrnService = {
  serviceId: number
  name: string
}
export type IrnServices = IrnService[]

export type District = {
  districtId: number
  name: string
}
export type Districts = District[]

export type County = {
  districtId: number
  countyId: number
  name: string
}
export type Counties = County[]

export type IrnRepositoryTable = IrnTable
export type IrnRepositoryTables = IrnRepositoryTable[]

export type GetTableParams = Partial<{
  serviceId: number
  districtId: number
  countyId: number
  startDate: Date
  endDate: Date
  startTime: Time
  endTime: Time
}>

export interface Repository {
  dbConfig: DbConfig
  counties: Counties
  districts: Districts
  irnServices: IrnServices
  irnTables: IrnRepositoryTables
}

export interface IrnRepository {
  addCounties: Action<Counties, void>
  addDistricts: Action<Districts, void>
  addIrnServices: Action<IrnServices, void>
  addIrnTables: Action<IrnRepositoryTables, void>
  clearAll: Action<void, void>
  clearAllTables: Action<void, void>
  end: Action<void, void>
  getConfig: Action<void, DbConfig>
  getCounties: Action<{ districtId?: number }, Counties>
  getDistricts: Action<void, Districts>
  getIrnServices: Action<void, IrnServices>
  getIrnTables: Action<GetTableParams, IrnRepositoryTables>
  switchIrnTables: Action<void, void>
  updateConfig: Action<DbConfig, void>
}
