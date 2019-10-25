import { pipe } from "fp-ts/lib/pipeable"
import { chain, map } from "fp-ts/lib/ReaderTaskEither"
import { flatten, isNil, sort, uniq } from "ramda"
import { getIrnTablesHtml } from "../../../irnFetch/main"
import { FetchIrnTablesParams } from "../../../irnFetch/models"
import {
  Counties,
  Districts,
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

const toNumber = (value?: string) => (isNil(value) ? undefined : Number.parseInt(value, 10))
const toDate = (value?: string) => toDateString(value)
const toTimeSlot = (value?: string) => value
const toBoolean = (value?: string) => !isNil(value) && value.toUpperCase().substr(0, 1) === "Y"
const toExistingNumber = (value: string) => Number.parseInt(value, 10)
const toExistingDate = (value: string) => toExistingDateString(value)

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
export const getCounties: Action<any, Counties> = params =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getCounties({ districtId: toNumber(params.districtId) })),
  )

interface GetIrnPlacesParams {
  districtId?: string
  countyId?: string
}
export const getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces> = params =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.getIrnPlaces({
        countyId: toNumber(params.countyId),
        districtId: toNumber(params.districtId),
      }),
    ),
  )

interface GetIrnTablesParams {
  countyId?: string
  date?: string
  districtId?: string
  endDate?: string
  endTime?: string
  onlyOnSaturdays?: string
  placeName?: string
  region?: string
  serviceId?: string
  startDate?: string
  startTime?: string
  timeSlot?: string
}
export const getIrnTables: Action<GetIrnTablesParams, IrnRepositoryTables> = params =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.getIrnTables({
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
      }),
    ),
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
  serviceId: number
  countyId: number
  districtId: number
  date: DateString
  placeName: string
  timeSlot: TimeSlot
  tableNumber: string
}

const sortTimes = (t1: TimeSlot, t2: TimeSlot) => t1.localeCompare(t2)

const byTimeSlots = ({ endTime, startTime, timeSlot }: TimeSlotsFilter) => (ts: TimeSlot) =>
  (isNil(timeSlot) || ts === timeSlot) && (isNil(startTime) || startTime <= ts) && (isNil(endTime) || endTime >= ts)

const getIrnTablesByClosestDate = (irnTables: IrnRepositoryTables) => {
  const closestDate = min(irnTables.map(t => t.date)) || irnTables[0].date
  return irnTables.filter(t => t.date === closestDate)
}

const getOneIrnTableResult = (irnTable: IrnRepositoryTable, timeSlotsFilter: TimeSlotsFilter): IrnTableResult => {
  const timeSlots = sort(sortTimes, irnTable.timeSlots).filter(byTimeSlots(timeSlotsFilter))
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

const getIrnTableResult = (params: GetIrnTablesParams, irnTables: IrnRepositoryTables) => {
  if (irnTables.length === 0) {
    return undefined
  }

  const irnTablesByClosestDate = getIrnTablesByClosestDate(irnTables)

  const timeSlotsFilter = {
    endTime: params.endTime,
    startTime: params.startTime,
    timeSlot: params.timeSlot,
  }

  return getOneIrnTableResult(irnTablesByClosestDate[0], timeSlotsFilter)
}

const findIrnTableMatch: (
  params: GetIrnTablesParams,
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

export const getIrnTableMatch: Action<GetIrnTablesParams, IrnTableMatchResult> = params =>
  pipe(
    getIrnTables(params),
    chain(findIrnTableMatch(params)),
  )

interface GetIrnTableScheduleHtmlParams {
  serviceId?: string
  districtId?: string
  countyId?: string
  date?: string
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
    ? pipe(
        actionOf({
          countyId: toExistingNumber(countyId),
          date: toExistingDate(date),
          districtId: toExistingNumber(districtId),
          serviceId: toExistingNumber(serviceId),
        }),
        chain(addDescriptionAndGetHtml),
      )
    : actionErrorOf(new ServiceError("Invalid params"))
