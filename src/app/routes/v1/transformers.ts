import { isNil } from "ramda"
import { GetIrnPlacesParams } from "../../../irnRepository/models"
import { toDateString, toExistingDateString } from "../../../utils/dates"
import { GetIrnTableMatchParams, GetIrnTableScheduleHtmlParams, GetIrnTablesParams } from "./domain"

type Stringify<T> = {
  [k in keyof T]?: string
}

const toNumber = (value?: string) => (isNil(value) ? undefined : Number.parseInt(value, 10))
const toDate = (value?: string) => toDateString(value)
const toTimeSlot = (value?: string) => value
const toBoolean = (value?: string) => !isNil(value) && value.toUpperCase().substr(0, 1) === "Y"
const toExistingNumber = (value: string) => Number.parseInt(value, 10)
const toExistingDate = (value: string) => toExistingDateString(value)

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

export const transformGetIrnTableMatchParams = (params: Stringify<GetIrnTableMatchParams>) => ({
  ...transformGetIrnTablesParams(params),
  selecteCountyId: toNumber(params.selectedCountyId),
  selectedDate: toDateString(params.selectedDate),
  selectedDistrictId: toNumber(params.selectedDistrictId),
  selectedPlaceName: params.selectedPlaceName,
})

export const transformGetIrnTableScheduleParams = (params: Stringify<GetIrnTableScheduleHtmlParams>) => ({
  countyId: toNumber(params.countyId),
  date: toDate(params.date),
  districtId: toNumber(params.districtId),
  serviceId: toNumber(params.serviceId),
})
