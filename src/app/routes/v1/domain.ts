import { pipe } from "fp-ts/lib/pipeable"
import { chain, map } from "fp-ts/lib/ReaderTaskEither"
import { flatten, isNil, sort, uniq } from "ramda"
import { getIrnTablesHtml } from "../../../irnFetch/main"
import { FetchIrnTablesParams } from "../../../irnFetch/models"
import {
  Counties,
  Districts,
  GetIrnRepositoryTablesParams,
  IrnPlaces,
  IrnRepositoryTable,
  IrnRepositoryTables,
  IrnServices,
} from "../../../irnRepository/models"
import { Action, actionErrorOf, actionOf, ask } from "../../../utils/actions"
import { ServiceError } from "../../../utils/audit"
import { min } from "../../../utils/collections"
import { DateString, toDateString, toExistingDateString } from "../../../utils/dates"
import { TimeSlot } from "../../../utils/models"

export const getServices: Action<void, IrnServices> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnServices()),
  )

export const getDistricts: Action<void, Districts> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getDistricts()),
  )

export interface GetCountiesParams {
  districtId?: string
}
export const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getCounties({ districtId })),
  )

interface GetIrnPlacesParams {
  districtId?: number
  countyId?: number
}
export const getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces> = ({ countyId, districtId }) =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.getIrnPlaces({
        countyId,
        districtId,
      }),
    ),
  )

export type GetIrnTablesParams = GetIrnRepositoryTablesParams

export const getIrnTables: Action<GetIrnTablesParams, IrnRepositoryTables> = params =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnTables(params)),
  )

interface IrnTableMatchResult {
  irnTableResult?: IrnTableResult
  otherDates: DateString[]
  otherPlaces: string[]
  otherTimeSlots: TimeSlot[]
}

interface TimeSlotsFilter {
  endTime?: TimeSlot
  startTime?: TimeSlot
  timeSlot?: TimeSlot
}

interface IrnTableResult {
  countyId: number
  date: DateString
  districtId: number
  placeName: string
  serviceId: number
  tableNumber: string
  timeSlot: TimeSlot
}

const sortTimeSlots = (t1: TimeSlot, t2: TimeSlot) => t1.localeCompare(t2)

const byTimeSlots = ({ endTime, startTime, timeSlot }: TimeSlotsFilter) => (ts: TimeSlot) =>
  (isNil(timeSlot) || ts === timeSlot) && (isNil(startTime) || startTime <= ts) && (isNil(endTime) || endTime >= ts)

const getIrnTablesByClosestDate = (irnTables: IrnRepositoryTables) => {
  const closestDate = min(irnTables.map(t => t.date)) || irnTables[0].date
  return irnTables.filter(t => t.date === closestDate)
}

const getOneIrnTableResult = (irnTable: IrnRepositoryTable, timeSlotsFilter: TimeSlotsFilter): IrnTableResult => {
  const timeSlots = sort(sortTimeSlots, irnTable.timeSlots).filter(byTimeSlots(timeSlotsFilter))
  const earlierTimeSlot = timeSlots[0]

  return {
    countyId: irnTable.countyId,
    date: irnTable.date,
    districtId: irnTable.districtId,
    placeName: irnTable.placeName,
    serviceId: irnTable.serviceId,
    tableNumber: irnTable.tableNumber,
    timeSlot: earlierTimeSlot,
  }
}

const getIrnTableResult = (
  {
    endTime,
    selectedCountyId,
    selectedDate,
    selectedDistrictId,
    selectedPlaceName,
    startTime,
    timeSlot,
  }: GetIrnTableMatchParams,
  irnTables: IrnRepositoryTables,
) => {
  const filteredIrnTables = irnTables.filter(
    t =>
      (isNil(selectedDate) || t.date === selectedDate) &&
      (isNil(selectedCountyId) || t.countyId === selectedCountyId) &&
      (isNil(selectedDistrictId) || t.districtId === selectedDistrictId) &&
      (isNil(selectedPlaceName) || t.placeName === selectedPlaceName),
  )

  if (filteredIrnTables.length > 0) {
    const irnTablesByClosestDate = getIrnTablesByClosestDate(filteredIrnTables)

    const timeSlotsFilter = {
      endTime,
      startTime,
      timeSlot,
    }

    return getOneIrnTableResult(irnTablesByClosestDate[0], timeSlotsFilter)
  } else {
    return undefined
  }
}

const findIrnTableMatch: (
  params: GetIrnTableMatchParams,
) => Action<IrnRepositoryTables, IrnTableMatchResult> = params => irnTables => {
  const irnTableResult = getIrnTableResult(params, irnTables)

  const irnTableMatchResult = {
    irnTableResult,
    otherDates: uniq(irnTables.map(t => t.date)),
    otherPlaces: uniq(irnTables.map(t => t.placeName)),
    otherTimeSlots: uniq(flatten(irnTables.map(t => t.timeSlots.filter(byTimeSlots(params))))),
  }

  return actionOf(irnTableMatchResult)
}

export interface GetIrnTableMatchParams extends GetIrnRepositoryTablesParams {
  selectedDate?: DateString
  selectedCountyId?: number
  selectedDistrictId?: number
  selectedPlaceName?: string
}
export const getIrnTableMatch: Action<GetIrnTableMatchParams, IrnTableMatchResult> = params =>
  pipe(
    getIrnTables(params),
    chain(findIrnTableMatch(params)),
  )

export interface GetIrnTableScheduleHtmlParams {
  serviceId?: number
  districtId?: number
  countyId?: number
  date?: DateString
}

const addDescriptionAndGetHtml: Action<FetchIrnTablesParams, string> = params => {
  const { serviceId, countyId } = params
  return pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.getIrnService({ serviceId }),
        chain(irnService =>
          pipe(
            env.irnRepository.getCounty({ countyId }),
            map(county => ({
              county: county ? county.name : undefined,
              irnService: irnService ? irnService.name : undefined,
            })),
          ),
        ),
        chain(descriptions => getIrnTablesHtml({ params, descriptions })),
      ),
    ),
  )
}

export const getIrnTableScheduleHtml: Action<GetIrnTableScheduleHtmlParams, string> = ({
  serviceId,
  districtId,
  countyId,
  date,
}) =>
  serviceId && districtId && countyId && date
    ? addDescriptionAndGetHtml({
        countyId,
        date,
        districtId,
        serviceId,
      })
    : actionErrorOf(new ServiceError("Invalid params"))
