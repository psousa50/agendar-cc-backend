import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { isNil } from "ramda"
import { Counties, Districts, IrnPlaces, IrnRepositoryTables, IrnServices } from "../../../irnRepository/models"
import { Action, ask } from "../../../utils/actions"

const toNumber = (value?: string) => (isNil(value) ? undefined : Number.parseInt(value, 10))
const toDate = (value?: string) => (isNil(value) ? undefined : new Date(Date.parse(value)))
const toTimeSlot = (value?: string) => value
const toBoolean = (value?: string) => !isNil(value) && value.toUpperCase().substr(0, 1) === "Y"

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
  region?: string
  serviceId?: string
  districtId?: string
  countyId?: string
  placeName?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  onlyOnSaturdays?: string
}
export const getIrnTables: Action<GetIrnTablesParams, IrnRepositoryTables> = params =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.getIrnTables({
        countyId: toNumber(params.countyId),
        districtId: toNumber(params.districtId),
        endDate: toDate(params.endDate),
        endTime: toTimeSlot(params.endTime),
        onlyOnSaturdays: toBoolean(params.onlyOnSaturdays),
        placeName: toTimeSlot(params.placeName),
        region: params.region,
        serviceId: toNumber(params.serviceId),
        startDate: toDate(params.startDate),
        startTime: params.startTime,
      }),
    ),
  )
