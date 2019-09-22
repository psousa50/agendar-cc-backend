import { DbConfig } from "../mongodb/main"
import { Action } from "../utils/actions"
import { GpsLocation, TimeSlot } from "../utils/models"

export type IrnService = {
  serviceId: number
  name: string
}
export type IrnServices = IrnService[]

export type District = {
  districtId: number
  name: string
  gpsLocation?: GpsLocation
}
export type Districts = District[]

export type County = {
  districtId: number
  countyId: number
  name: string
  gpsLocation?: GpsLocation
}
export type Counties = County[]

export type IrnRepositoryTable = {
  serviceId: number
  districtId: number
  countyId: number
  locationName: string
  tableNumber: string
  address: string
  postalCode: string
  phone: string
  date: Date
  timeSlots: TimeSlot[]
}

export type IrnRepositoryTables = IrnRepositoryTable[]

export type GetTableParams = Partial<{
  serviceId: number
  districtId: number
  countyId: number
  startDate: Date
  endDate: Date
  startTime: TimeSlot
  endTime: TimeSlot
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
  addIrnTablesTemporary: Action<IrnRepositoryTables, void>
  clearAll: Action<void, void>
  clearIrnTablesTemporary: Action<void, void>
  close: Action<void, void>
  getConfig: Action<void, DbConfig | null>
  getCounties: Action<{ districtId?: number }, Counties>
  getDistricts: Action<void, Districts>
  getIrnServices: Action<void, IrnServices>
  getIrnTables: Action<GetTableParams, IrnRepositoryTables>
  switchIrnTables: Action<void, void>
  updateConfig: Action<DbConfig, void>
}

export const getCountyFromIrnTable = (irnTable: IrnRepositoryTable) => ({
  countyId: irnTable.countyId,
  districtId: irnTable.districtId,
})
