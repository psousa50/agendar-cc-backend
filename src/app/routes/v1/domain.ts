import { pipe } from "fp-ts/lib/function"
import { chain, map } from "fp-ts/lib/ReaderTaskEither"
import { flatten, isNil, sort, uniq } from "ramda"
import {
  Counties,
  Districts,
  GetIrnRepositoryTablesParams,
  IrnPlaces,
  IrnRepositoryTable,
  IrnRepositoryTables,
  IrnServices,
} from "../../../irnRepository/models"
import { Action, actionOf, ask } from "../../../utils/actions"
import { DateString, toUtcDate } from "../../../utils/dates"
import { calcDistanceInKm } from "../../../utils/location"
import { GpsLocation, TimeSlot } from "../../../utils/models"

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
  lastUpdatedTimestamp?: number
}
export const getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces> = params =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnPlaces(params)),
  )

export type GetIrnTablesParams = GetIrnRepositoryTablesParams

export const getIrnTables: Action<GetIrnTablesParams, IrnRepositoryTables> = params =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnTables(params)),
  )

interface IrnTableMatchResult {
  irnTableResults?: {
    closest: IrnTableResult
    soonest: IrnTableResult
  }
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

const byDate = (t1: IrnRepositoryTable, t2: IrnRepositoryTable) =>
  toUtcDate(t1.date).getTime() - toUtcDate(t2.date).getTime()

const byDistance = (t1: IrnRepositoryTableWithDistance, t2: IrnRepositoryTableWithDistance) =>
  (t1.distanceKm || 0) - (t2.distanceKm || 0)

const byDateAndDistance = (t1: IrnRepositoryTable, t2: IrnRepositoryTable) => byDate(t1, t2) || byDistance(t1, t2)
const byDistanceAndDate = (t1: IrnRepositoryTable, t2: IrnRepositoryTable) => byDistance(t1, t2) || byDate(t1, t2)

const sortIrnTablesByClosestDate = (irnTables: IrnRepositoryTables) => sort(byDateAndDistance, irnTables)

export const sortIrnTablesByClosestPlace = (irnTables: IrnRepositoryTableWithDistance[]) =>
  sort(byDistanceAndDate, irnTables)

const bySelectedFilter = ({
  selectedCountyId,
  selectedDate,
  selectedDistrictId,
  selectedPlaceName,
  selectedTimeSlot,
}: GetIrnTableMatchParams) => (irnTable: IrnRepositoryTableWithDistance) =>
  (isNil(selectedDate) || irnTable.date === selectedDate) &&
  (isNil(selectedCountyId) || irnTable.countyId === selectedCountyId) &&
  (isNil(selectedDistrictId) || irnTable.districtId === selectedDistrictId) &&
  (isNil(selectedPlaceName) || irnTable.placeName === selectedPlaceName) &&
  (isNil(selectedTimeSlot) || irnTable.timeSlots.includes(selectedTimeSlot))

const getIrnTableResult = (
  tablesFilter: (irnTables: IrnRepositoryTables) => IrnRepositoryTables,
  { endTime, selectedTimeSlot, startTime, timeSlot }: GetIrnTableMatchParams,
  irnTables: IrnRepositoryTables,
) => {
  const irnTablesFiltered = tablesFilter(irnTables)

  const timeSlotsFilter = {
    endTime,
    startTime,
    timeSlot: timeSlot || selectedTimeSlot,
  }

  const irnTable = irnTablesFiltered[0]
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

const getIrnTableResults = (params: GetIrnTableMatchParams, irnTables: IrnRepositoryTableWithDistance[]) => {
  if (irnTables.length > 0) {
    const soonest = getIrnTableResult(sortIrnTablesByClosestDate, params, irnTables)
    return {
      closest: isNil(params.districtId) ? soonest : getIrnTableResult(sortIrnTablesByClosestPlace, params, irnTables),
      soonest,
    }
  } else {
    return undefined
  }
}

const getDistrictLocation: Action<number | undefined, GpsLocation | undefined> = districtId =>
  pipe(
    ask(),
    chain(env =>
      districtId
        ? pipe(
            env.irnRepository.getDistrict({ districtId }),
            map(d => (d ? d.gpsLocation : undefined)),
          )
        : actionOf(undefined),
    ),
  )

const getCountyLocation: Action<number | undefined, GpsLocation | undefined> = countyId =>
  pipe(
    ask(),
    chain(env =>
      countyId
        ? pipe(
            env.irnRepository.getCounty({ countyId }),
            map(c => (c ? c.gpsLocation : undefined)),
          )
        : actionOf(undefined),
    ),
  )

const getIrnPlaceLocation: Action<string | undefined, GpsLocation | undefined> = placeName =>
  pipe(
    ask(),
    chain(env =>
      placeName
        ? pipe(
            env.irnRepository.getIrnPlace({ placeName }),
            map(p => (p ? p.gpsLocation : undefined)),
          )
        : actionOf(undefined),
    ),
  )

const getParamsLocation: Action<GetIrnTableMatchParams, GpsLocation | undefined> = ({
  districtId,
  countyId,
  placeName,
  gpsLocation,
}) =>
  pipe(
    getDistrictLocation(districtId),
    chain(dl => (dl ? actionOf(dl) : getCountyLocation(countyId))),
    chain(cl => (cl ? actionOf(cl) : getIrnPlaceLocation(placeName))),
    chain(pl => (pl ? actionOf(pl) : actionOf(gpsLocation))),
  )

type IrnRepositoryTableWithDistance = IrnRepositoryTable & { distanceKm?: number }
const getIrnTablesDistance = (
  districtId: number | undefined,
  paramsGpsLocation: GpsLocation | undefined,
): Action<IrnRepositoryTables, IrnRepositoryTableWithDistance[]> => irnTables =>
  !isNil(districtId) && paramsGpsLocation
    ? actionOf(
        irnTables
          .filter(t => !isNil(t.gpsLocation))
          .map(irnTable => ({ ...irnTable, distanceKm: calcDistanceInKm(paramsGpsLocation, irnTable.gpsLocation!) })),
      )
    : actionOf(irnTables.map(irnTable => ({ ...irnTable, distanceKm: 0 })))

const findIrnTableMatch: (
  params: GetIrnTableMatchParams,
) => Action<IrnRepositoryTables, IrnTableMatchResult> = params => irnTables => {
  const { districtId, countyId, placeName, gpsLocation } = params
  const hasLocation = !isNil(districtId) || !isNil(countyId) || !isNil(placeName) || !isNil(gpsLocation)
  const distanceRadiusKm = hasLocation ? params.distanceRadiusKm : undefined

  return pipe(
    getParamsLocation(params),
    chain(paramsLocation =>
      pipe(
        getIrnTablesDistance(districtId, paramsLocation)(irnTables),
        chain(irnTablesWithDistance =>
          actionOf(
            irnTablesWithDistance.filter(
              t => isNil(distanceRadiusKm) || (t.distanceKm && t.distanceKm < distanceRadiusKm),
            ),
          ),
        ),
        chain(filteredIrnTablesByRadius => {
          const filteredIrnTables = filteredIrnTablesByRadius.filter(bySelectedFilter(params))
          const irnTableResults = getIrnTableResults(params, filteredIrnTables)

          const irnTableMatchResult = {
            irnTableResults,
            otherDates: uniq(filteredIrnTables.map(t => t.date)),
            otherPlaces: uniq(filteredIrnTables.map(t => t.placeName)),
            otherTimeSlots: uniq(flatten(filteredIrnTables.map(t => t.timeSlots.filter(byTimeSlots(params))))),
          }

          return actionOf(irnTableMatchResult)
        }),
      ),
    ),
  )
}

const removeLocationIfHasDistanceRadius = (params: GetIrnTableMatchParams) =>
  params.distanceRadiusKm
    ? {
        ...params,
        countyId: undefined,
        districtId: undefined,
        placeName: undefined,
      }
    : params

export interface GetIrnTableMatchParams extends GetIrnRepositoryTablesParams {
  selectedDate?: DateString
  selectedCountyId?: number
  selectedDistrictId?: number
  selectedPlaceName?: string
  selectedTimeSlot?: string
  gpsLocation?: GpsLocation
  distanceRadiusKm?: number
}
export const getIrnTableMatch: Action<GetIrnTableMatchParams, IrnTableMatchResult> = params =>
  pipe(
    getIrnTables(removeLocationIfHasDistanceRadius(params)),
    chain(findIrnTableMatch(params)),
  )
