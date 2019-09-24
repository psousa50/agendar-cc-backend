import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, map, orElse, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { IrnTables } from "../irnFetch/models"
import { Counties, IrnRepositoryTable } from "../irnRepository/models"
import { globalCounties } from "../staticData/counties"
import { globalDistricts } from "../staticData/districts"
import { globalIrnServices } from "../staticData/services"
import { Action, actionOf, ask } from "../utils/actions"
import { flatten } from "../utils/collections"
import { addDays } from "../utils/dates"
import { GpsLocation } from "../utils/models"
import { IrnCrawler, RefreshTablesParams } from "./models"

const rteArraySequence = array.sequence(readerTaskEither)

const merge = (irnTables: IrnTables, toMerge: IrnTables) =>
  toMerge.reduce((acc, table) => (acc.findIndex(t => equals(t, table)) < 0 ? [...acc, table] : acc), irnTables)

const flattenTables: Action<IrnTables[], IrnTables> = irnTablesArray => actionOf(flatten(irnTablesArray))

const findTableWithLowestDate = (irnTables: IrnTables) =>
  irnTables.reduce((acc, t) => (acc && acc.date <= t.date ? acc : t), irnTables[0] || undefined)

const crawlTableDates = (
  serviceId: number,
  dateLimit: Date,
  nextDate: Date = new Date(0),
): Action<IrnTables, IrnTables> => irnTables => {
  const fetchNextTables = (countyId: number, districtId: number, fromDate: Date): Action<void, IrnTables> => () =>
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
          ? crawlTableDates(serviceId, dateLimit, fromDate)(merge(irnTables, newIrnTables))
          : actionOf(irnTables),
      ),
    )
  const nextTableToCrawl = findTableWithLowestDate(irnTables.filter(t => t.date >= nextDate))

  return nextTableToCrawl && nextTableToCrawl.date <= dateLimit
    ? fetchNextTables(nextTableToCrawl.countyId, nextTableToCrawl.districtId, addDays(nextTableToCrawl.date, 1))()
    : actionOf(irnTables)
}

const addStaticData: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.addIrnServices(globalIrnServices),
        chain(() => env.irnRepository.addDistricts(globalDistricts)),
        chain(() => env.irnRepository.addCounties(globalCounties)),
        chain(() => env.irnRepository.updateConfig({ staticDataAdded: true })),
      ),
    ),
  )

const start = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getConfig()),
    chain(dbConfig => (dbConfig && dbConfig.staticDataAdded ? actionOf(undefined) : addStaticData())),
  )

const refreshTables: Action<RefreshTablesParams, void> = params =>
  pipe(
    ask(),
    chain(env => {
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

      const getTablesForService = (serviceId: number, counties: Counties) =>
        pipe(
          rteArraySequence(
            counties.map(county =>
              env.irnFetch.getIrnTables({ serviceId, countyId: county.countyId, districtId: county.districtId }),
            ),
          ),
          chain(irnTablesPerCounty => rteArraySequence(irnTablesPerCounty.map(crawlTableDates(serviceId, dateLimit)))),
          chain(flattenTables),
        )

      const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)

      return pipe(
        getServicesAndCounties(),
        chain(({ services, counties }) =>
          rteArraySequence(services.map(service => getTablesForService(service.serviceId, counties))),
        ),
        chain(flattenTables),
        chain(irnTables => {
          env.irnRepository.clearIrnTablesTemporary()
          return actionOf(irnTables)
        }),
        chain(env.irnRepository.addIrnTablesTemporary),
        chain(env.irnRepository.switchIrnTables),
      )
    }),
  )

const updateIrnPlace = (
  countyId: number,
  districtId: number,
  irnPlace: string,
): Action<GpsLocation | undefined, void> => location =>
  pipe(
    ask(),
    chain(env =>
      env.irnRepository.updateIrnPlace({
        countyId,
        districtId,
        gpsLocation: location,
        name: irnPlace,
      }),
    ),
  )

const updateIrnTablePlace: Action<IrnRepositoryTable, void> = ({ address, countyId, districtId, placeName }) =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.getIrnPlace({ placeName }),
        chain(irnPlace => {
          return irnPlace === null
            ? pipe(
                env.irnRepository.getCounty({ countyId }),
                chain(county => (county ? env.geoCoding.get(`${address}+${county.name}`) : actionOf(undefined))),
                chain(location => updateIrnPlace(countyId, districtId, placeName)(location)),
                orElse(() => updateIrnPlace(countyId, districtId, placeName)(undefined)),
              )
            : actionOf(undefined)
        }),
      ),
    ),
  )

const updateIrnPlaces: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnTables({})),
    chain(irnTables =>
      irnTables.reduceRight(
        (acc, irnTable) =>
          pipe(
            updateIrnTablePlace(irnTable),
            chain(() => acc),
          ),
        actionOf(undefined),
      ),
    ),
    chain(() => actionOf(undefined)),
  )

export const irnCrawler: IrnCrawler = {
  refreshTables,
  start,
  updateIrnPlaces,
}
