import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import { isNil } from "ramda"
import { Districts, IrnPlaces, IrnRepositoryTables, IrnServices } from "../../../irnRepository/models"
import { Action, ask } from "../../../utils/actions"

const toNumber = (value: string | undefined) => (isNil(value) ? undefined : Number.parseInt(value, 10))

const toDate = (value: string | undefined) => (isNil(value) ? undefined : new Date(Date.parse(value)))

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
export const getCounties: Action<any, Districts> = params =>
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
  serviceId?: string
  districtId?: string
  countyId?: string
  placeName?: string
  startDate?: string
  endDate?: string
}
export const getIrnTables: Action<GetIrnTablesParams, IrnRepositoryTables> = params =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.getIrnTables({
        countyId: toNumber(params.countyId),
        districtId: toNumber(params.districtId),
        endDate: toDate(params.endDate),
        placeName: params.placeName,
        serviceId: toNumber(params.serviceId),
        startDate: toDate(params.startDate),
      }),
    ),
  )
