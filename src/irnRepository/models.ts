import { DbConfig } from "../mongodb/main"
import { Action } from "../utils/actions"
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
}
export type IrnPlaces = IrnPlace[]

export type IrnRepositoryTable = {
  countyId: number
  date: Date
  districtId: number
  placeName: string
  region: string
  serviceId: number
  tableNumber: string
  timeSlots: TimeSlot[]
}

export type IrnRepositoryTables = IrnRepositoryTable[]

export type GetIrnPlacesParams = Partial<{
  districtId: number
  countyId: number
}>

export type GetIrnRepositoryTablesParams = Partial<{
  countyId: number
  districtId: number
  endDate: Date
  endTime: TimeSlot
  onlyOnSaturdays: boolean
  placeName: string
  region: string
  serviceId: number
  startDate: Date
  startTime: TimeSlot
}>

export interface IrnRepository {
  addCounties: Action<Counties, void>
  addDistricts: Action<Districts, void>
  addIrnServices: Action<IrnServices, void>
  addIrnTablesTemporary: Action<IrnRepositoryTables, void>
  clearAll: Action<void, void>
  clearIrnTablesTemporary: Action<void, void>
  close: Action<void, void>
  getConfig: Action<void, DbConfig | null>
  getCounty: Action<{ countyId: number }, County | null>
  getCounties: Action<{ districtId?: number }, Counties>
  getDistrictRegion: Action<number, Region>
  getDistricts: Action<void, Districts>
  getIrnServices: Action<void, IrnServices>
  getIrnTables: Action<GetIrnRepositoryTablesParams, IrnRepositoryTables>
  switchIrnTables: Action<void, void>
  updateConfig: Action<DbConfig, void>
  getIrnPlace: Action<{ placeName: string }, IrnPlace | null>
  getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces>
  upsertIrnPlace: Action<Partial<IrnPlace>, void>
}

export const getCountyFromIrnTable = (irnTable: IrnRepositoryTable) => ({
  countyId: irnTable.countyId,
  districtId: irnTable.districtId,
})
