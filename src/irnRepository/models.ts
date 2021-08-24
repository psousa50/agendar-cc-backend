import { IrnLog, IrnLogInput } from "../mongodb/main"
import { Action } from "../utils/actions"
import { DateString } from "../utils/dates"
import { GpsLocation, TimeSlot } from "../utils/models"

export type IrnService = {
  serviceId: number
  name: string
}
export type IrnServices = IrnService[]

export type Region = "Acores" | "Continente" | "Madeira"

export type District = {
  districtId: number
  region: Region
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

export type IrnPlace = {
  address: string
  countyId: number
  districtId: number
  gpsLocation?: GpsLocation
  name: string
  phone: string
  postalCode: string
  lastUpdatedTimestamp: number
  active: boolean
}
export type IrnPlaces = IrnPlace[]

export type IrnRepositoryTable = {
  countyId: number
  date: DateString
  districtId: number
  placeName: string
  region: string
  serviceId: number
  tableNumber: string
  timeSlots: TimeSlot[]
  gpsLocation?: GpsLocation
}

export type IrnRepositoryTables = IrnRepositoryTable[]

export type GetIrnPlacesParams = Partial<{
  districtId: number
  countyId: number
  lastUpdatedTimestamp: number
  active: boolean
}>

export type GetIrnRepositoryTablesParams = Partial<{
  countyId: number
  date: DateString
  districtId: number
  endDate: DateString
  endTime: TimeSlot
  onlyOnSaturdays: boolean
  placeName: string
  region: string
  serviceId: number
  startDate: DateString
  startTime: TimeSlot
  timeSlot: TimeSlot
}>

export interface IrnRepository {
  addCounties: Action<Counties, void>
  addDistricts: Action<Districts, void>
  addIrnLog: Action<IrnLogInput, void>
  addIrnServices: Action<IrnServices, void>
  addIrnTablesTemporary: Action<IrnRepositoryTables, void>
  clearAll: Action<void, void>
  clearIrnTablesTemporary: Action<void, void>
  close: Action<void, void>
  getCounty: Action<{ countyId: number }, County | undefined>
  getCounties: Action<{ districtId?: number }, Counties>
  getDistrictRegion: Action<number, Region>
  getDistrict: Action<{ districtId: number }, District | undefined>
  getDistricts: Action<void, Districts>
  getIrnService: Action<{ serviceId: number }, IrnService | undefined>
  getIrnServices: Action<void, IrnServices>
  getIrnTables: Action<GetIrnRepositoryTablesParams, IrnRepositoryTables>
  getIrnTablesCount: Action<void, number>
  getIrnTablesTemporaryCount: Action<void, number>
  getLastRefreshIrnLog: Action<void, IrnLog | undefined>
  switchIrnTables: Action<void, void>
  getIrnPlace: Action<{ placeName: string }, IrnPlace | undefined>
  getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces>
  removeOldLogs: Action<void, void>
  upsertIrnPlace: Action<Partial<IrnPlace>, void>
  updateIrnTablesLocation: Action<void, void>
  updateActiveIrnPlaces: Action<void, void>
}

export const getCountyFromIrnTable = (irnTable: IrnRepositoryTable) => ({
  countyId: irnTable.countyId,
  districtId: irnTable.districtId,
})
