import { array } from "fp-ts/lib/Array"
import { right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, fromEither, map, orElse, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "../environment"
import { IrnTable, IrnTables } from "../irnFetch/models"
import { Counties, IrnPlace, IrnRepositoryTables, Region } from "../irnRepository/models"
import { globalCounties } from "../staticData/counties"
import { globalDistricts } from "../staticData/districts"
import { globalIrnServices } from "../staticData/irnServices"
import { Action, actionOf, ask, rteActionsSequence } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { addDays, DateString, toExistingDateString } from "../utils/dates"
import { IrnCrawler, RefreshTablesParams } from "./models"

const rteArraySequence = array.sequence(readerTaskEither)

const findTableWithLowestDate = (irnTables: IrnTables) =>
  irnTables.reduce((acc, t) => (acc && acc.date <= t.date ? acc : t), irnTables[0] || undefined)

const addTablesAndCrawlNextDates = (
  lastUpdatedTimestamp: number,
  serviceId: number,
  dateLimit: DateString,
  nextDate: DateString = toExistingDateString(new Date(0)),
): Action<IrnTables, void> => irnTables => {
  const fetchNextTables = (countyId: number, districtId: number, fromDate: DateString): Action<void, void> => () =>
    pipe(
      ask(),
      chain(env =>
        env.irnFetch.getIrnTables({
          countyId,
          date: fromDate,
          districtId,
          serviceId,
        }),
      ),
      chain(newIrnTables =>
        newIrnTables.length > 0
          ? addTablesAndCrawlNextDates(lastUpdatedTimestamp, serviceId, dateLimit, fromDate)(newIrnTables)
          : actionOf(undefined),
      ),
    )

  const nextTableToCrawl = findTableWithLowestDate(irnTables.filter(t => t.date >= nextDate))

  return pipe(
    addIrnRepositoryTables(lastUpdatedTimestamp)(irnTables),
    chain(_ =>
      nextTableToCrawl && nextTableToCrawl.date <= dateLimit
        ? fetchNextTables(nextTableToCrawl.countyId, nextTableToCrawl.districtId, addDays(nextTableToCrawl.date, 1))()
        : actionOf(undefined),
    ),
  )
}

const addStaticData: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.addIrnServices(globalIrnServices),
        chain(() => env.irnRepository.addDistricts(globalDistricts)),
        chain(() => env.irnRepository.addCounties(globalCounties)),
      ),
    ),
  )

const start = () => addStaticData()

const extractIrnRepositoryTable = (irnTable: IrnTable, region: Region) => ({
  countyId: irnTable.countyId,
  date: irnTable.date,
  districtId: irnTable.districtId,
  placeName: irnTable.placeName,
  region,
  serviceId: irnTable.serviceId,
  tableNumber: irnTable.tableNumber,
  timeSlots: irnTable.timeSlots,
})

const extractIrnRepositoryTables: Action<IrnTables, IrnRepositoryTables> = irnTables =>
  pipe(
    ask(),
    chain(env =>
      rteArraySequence(
        irnTables.map(irnTable =>
          pipe(
            env.irnRepository.getDistrictRegion(irnTable.districtId),
            map(region => extractIrnRepositoryTable(irnTable, region)),
          ),
        ),
      ),
    ),
  )

const extractIrnPlace = (irnTable: IrnTable, lastUpdatedTimestamp: number) => ({
  address: irnTable.address,
  countyId: irnTable.countyId,
  districtId: irnTable.districtId,
  lastUpdatedTimestamp,
  name: irnTable.placeName,
  phone: irnTable.phone,
  postalCode: irnTable.postalCode,
})

const upsertIrnPlaces = (lastUpdatedTimestamp: number): Action<IrnTables, void> => irnTables => {
  return pipe(
    ask(),
    chain(env =>
      irnTables.reduceRight(
        (acc, irnTable) =>
          pipe(
            env.irnRepository.upsertIrnPlace(extractIrnPlace(irnTable, lastUpdatedTimestamp)),
            chain(() => acc),
          ),
        actionOf(undefined),
      ),
    ),
  )
}

const addIrnRepositoryTables = (lastUpdatedTimestamp: number): Action<IrnTables, void> => irnTables => {
  return pipe(
    ask(),
    chain(env =>
      pipe(
        extractIrnRepositoryTables(irnTables),
        chain(env.irnRepository.addIrnTablesTemporary),
        chain(_ => upsertIrnPlaces(lastUpdatedTimestamp)(irnTables)),
      ),
    ),
  )
}

const refreshTables: Action<RefreshTablesParams, void> = params => {
  return pipe(
    ask(),
    chain(env => {
      const lastUpdatedTimestamp = env.now()
      const getServicesAndCounties = () =>
        pipe(
          env.irnRepository.getIrnServices(),
          chain(services =>
            pipe(
              env.irnRepository.getCounties({}),
              map(counties => ({ services, counties })),
            ),
          ),
        )

      const addTablesForService = (serviceId: number, counties: Counties) =>
        pipe(
          rteArraySequence(
            counties.map(county =>
              env.irnFetch.getIrnTables({ serviceId, countyId: county.countyId, districtId: county.districtId }),
            ),
          ),
          chain(irnTablesPerCounty =>
            rteArraySequence(
              irnTablesPerCounty.map(addTablesAndCrawlNextDates(lastUpdatedTimestamp, serviceId, dateLimit)),
            ),
          ),
        )

      const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)

      return pipe(
        env.irnRepository.clearIrnTablesTemporary(),
        chain(_ => getServicesAndCounties()),
        chain(({ services, counties }) =>
          rteArraySequence(services.map(service => addTablesForService(service.serviceId, counties))),
        ),
        chain(() => env.irnRepository.getIrnTablesCount()),
        chain(irnTablesCount =>
          pipe(
            env.irnRepository.getIrnTablesTemporaryCount(),
            map(irnTablesTemporaryCount => irnTablesTemporaryCount / irnTablesCount > 0.3),
          ),
        ),
        chain(okToGo => (okToGo ? env.irnRepository.switchIrnTables() : actionOf(undefined))),
      )
    }),
  )
}

const updateIrnPlaceLocation: Action<IrnPlace, void> = irnPlace =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.getCounty({ countyId: irnPlace.countyId }),
        chain(county => (county ? env.geoCoding.get(`${irnPlace.address}+${county.name}`) : actionOf(undefined))),
        chain(gpsLocation =>
          gpsLocation ? env.irnRepository.upsertIrnPlace({ ...irnPlace, gpsLocation }) : actionOf(undefined),
        ),
        orElse<Environment, ServiceError, void, ServiceError>(e => {
          env.log(`Error fetching IrnPlaceLocation for ${irnPlace.address} -> ${e.message}`)
          return fromEither(right(undefined))
        }),
      ),
    ),
  )

const updateIrnPlacesLocation: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnPlaces({})),
    map(irnPlaces => irnPlaces.filter(p => !p.gpsLocation)),
    chain(irnPlaces => rteActionsSequence(irnPlaces.map(updateIrnPlaceLocation))),
    chain(() => actionOf(undefined)),
  )

const updateActiveIrnPlaces: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.updateActiveIrnPlaces()),
    chain(() => actionOf(undefined)),
  )

const updateIrnTablesLocation: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.updateIrnTablesLocation()),
  )

export const irnCrawler: IrnCrawler = {
  refreshTables,
  start,
  updateActiveIrnPlaces,
  updateIrnPlacesLocation,
  updateIrnTablesLocation,
}
