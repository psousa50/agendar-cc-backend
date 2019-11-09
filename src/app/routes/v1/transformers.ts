import { isNil } from "ramda"
import { GetIrnPlacesParams } from "../../../irnRepository/models"
import { toDateString } from "../../../utils/dates"
import { GetIrnTableMatchParams, GetIrnTablesParams } from "./domain"

type Stringify<T> = {
  [k in keyof T]?: string
}

const toNumber = (value?: string) => (isNil(value) ? undefined : Number.parseInt(value, 10))
const toExistingNumber = (value: string) => Number.parseInt(value, 10)
const toDate = (value?: string) => toDateString(value)
const toTimeSlot = (value?: string) => value
const toBoolean = (value?: string) => !isNil(value) && value.toUpperCase().substr(0, 1) === "Y"

export const transformGetCountiesParams = (params: { districtId?: string }) => ({
  districtId: toNumber(params.districtId),
})

export const transformGetIrnPlacesParams = (params: Stringify<GetIrnPlacesParams>) => ({
  countyId: toNumber(params.countyId),
  districtId: toNumber(params.districtId),
})

export const transformGetIrnTablesParams = (params: Stringify<GetIrnTablesParams>) => ({
  countyId: toNumber(params.countyId),
  date: toDate(params.date),
  districtId: toNumber(params.districtId),
  endDate: toDate(params.endDate),
  endTime: toTimeSlot(params.endTime),
  onlyOnSaturdays: toBoolean(params.onlyOnSaturdays),
  placeName: toTimeSlot(params.placeName),
  region: params.region,
  serviceId: toNumber(params.serviceId),
  startDate: toDate(params.startDate),
  startTime: params.startTime,
  timeSlot: toTimeSlot(params.timeSlot),
})

export type GetIrnTableMatchQueryParams = Partial<{
  countyId: string
  date: string
  districtId: string
  endDate: string
  endTime: string
  onlyOnSaturdays: string
  placeName: string
  region: string
  serviceId: string
  startDate: string
  startTime: string
  timeSlot: string
  selectedDate: string
  selectedCountyId: string
  selectedDistrictId: string
  selectedPlaceName: string
  selectedTimeSlot: string
  lat: string
  lng: string
  distanceRadiusKm: string
}>

export const transformGetIrnTableMatchParams = (params: GetIrnTableMatchQueryParams): GetIrnTableMatchParams => ({
  ...transformGetIrnTablesParams(params),
  distanceRadiusKm: toNumber(params.distanceRadiusKm),
  selectedCountyId: toNumber(params.selectedCountyId),
  selectedDate: toDateString(params.selectedDate),
  selectedDistrictId: toNumber(params.selectedDistrictId),
  selectedPlaceName: params.selectedPlaceName,
  ...(params.lat && params.lng
    ? { gpsLocation: { latitude: toExistingNumber(params.lat), longitude: toExistingNumber(params.lng) } }
    : {}),
  selectedTimeSlot: params.selectedTimeSlot,
})
