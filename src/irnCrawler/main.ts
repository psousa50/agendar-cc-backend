import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, map, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { IrnTable, IrnTables } from "../irnFetch/models"
import { Counties, County, IrnPlace, IrnRepositoryTables, IrnService, Region } from "../irnRepository/models"
import { globalCounties } from "../staticData/counties"
import { globalDistricts } from "../staticData/districts"
import { globalIrnServices } from "../staticData/irnServices"
import { Action, actionOf, ask, mapActionsInSequence, pipeActionsInSequence } from "../utils/actions"
import { flatten } from "../utils/collections"
import { addDays } from "../utils/dates"
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

const extractIrnPlace = (irnTable: IrnTable) => ({
  address: irnTable.address,
  countyId: irnTable.countyId,
  districtId: irnTable.districtId,
  name: irnTable.placeName,
  phone: irnTable.phone,
  postalCode: irnTable.postalCode,
})

const upsertIrnPlaces: Action<IrnTables, void> = irnTables =>
  pipe(
    ask(),
    chain(env =>
      irnTables.reduceRight(
        (acc, irnTable) =>
          pipe(
            env.irnRepository.upsertIrnPlace(extractIrnPlace(irnTable)),
            chain(() => acc),
          ),
        actionOf(undefined),
      ),
    ),
  )

const addIrnTables: Action<IrnTables, void> = irnTables =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.clearIrnTablesTemporary(),
        chain(_ => extractIrnRepositoryTables(irnTables)),
        chain(env.irnRepository.addIrnTablesTemporary),
        chain(env.irnRepository.switchIrnTables),
      ),
    ),
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

      const getTablesForService: Action<{ serviceId: number; counties: Counties }, IrnTables> = ({
        serviceId,
        counties,
      }) =>
        pipe(
          mapActionsInSequence<County, IrnTable[]>(counties)(county =>
            env.irnFetch.getIrnTables({ serviceId, countyId: county.countyId, districtId: county.districtId }),
          ),
          chain(irnTablesPerCounty => rteArraySequence(irnTablesPerCounty.map(crawlTableDates(serviceId, dateLimit)))),
          chain(flattenTables),
        )

      const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)

      return pipe(
        getServicesAndCounties(),
        chain(({ services, counties }) =>
          mapActionsInSequence<IrnService, IrnTables>(services)(service =>
            getTablesForService({ serviceId: service.serviceId, counties }),
          ),
        ),
        chain(flattenTables),
        chain(irnTables =>
          pipe(
            addIrnTables(irnTables),
            chain(_ => upsertIrnPlaces(irnTables)),
          ),
        ),
      )
    }),
  )

const updateIrnPlace: Action<IrnPlace, void> = irnPlace =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        env.irnRepository.getCounty({ countyId: irnPlace.countyId }),
        chain(county => (county ? env.geoCoding.get(`${irnPlace.address}+${county.name}`) : actionOf(undefined))),
        chain(gpsLocation =>
          gpsLocation ? env.irnRepository.upsertIrnPlace({ ...irnPlace, gpsLocation }) : actionOf(undefined),
        ),
      ),
    ),
  )

const updateIrnPlaces: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env => env.irnRepository.getIrnPlaces({})),
    chain(irnPlaces => pipeActionsInSequence(irnPlaces.filter(p => p.gpsLocation === undefined))(updateIrnPlace)),
    chain(() => actionOf(undefined)),
  )

export const irnCrawler: IrnCrawler = {
  refreshTables,
  start,
  updateIrnPlaces,
}
