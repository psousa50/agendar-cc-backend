import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, map, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { IrnTables } from "../irnFetch/models"
import { Counties, County, IrnService } from "../irnRepository/models"
import { globalCounties } from "../staticData/counties"
import { globalDistricts } from "../staticData/districts"
import { globalIrnServices } from "../staticData/services"
import { Action, actionOf, ask } from "../utils/actions"
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
  service: IrnService,
  dateLimit: Date,
  nextDate: Date = new Date(0),
): Action<IrnTables, IrnTables> => irnTables => {
  const fetchNextTables = (county: County, fromDate: Date): Action<void, IrnTables> => () =>
    pipe(
      ask(),
      chain(env =>
        env.irnFetch.getIrnTables({
          county,
          date: fromDate,
          service,
        }),
      ),
      chain(newIrnTables =>
        newIrnTables.length > 0
          ? crawlTableDates(service, dateLimit, fromDate)(merge(irnTables, newIrnTables))
          : actionOf(irnTables),
      ),
    )
  const nextTableToCrawl = findTableWithLowestDate(irnTables.filter(t => t.date > nextDate))

  return nextTableToCrawl && nextTableToCrawl.date <= dateLimit
    ? fetchNextTables(nextTableToCrawl.county, addDays(nextTableToCrawl.date, 1))()
    : actionOf(irnTables)
}

const start = () =>
  pipe(
    ask(),
    chain(env => {
      env.irnRepository.addIrnServices(globalIrnServices)
      env.irnRepository.addDistricts(globalDistricts)
      env.irnRepository.addCounties(globalCounties)
      return actionOf([])
    }),
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

      const getTablesForService = (service: IrnService, counties: Counties) =>
        pipe(
          rteArraySequence(counties.map(county => env.irnFetch.getIrnTables({ service, county }))),
          chain(irnTablesPerCounty => rteArraySequence(irnTablesPerCounty.map(crawlTableDates(service, dateLimit)))),
          chain(flattenTables),
        )

      const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)

      return pipe(
        getServicesAndCounties(),
        chain(({ services, counties }) =>
          rteArraySequence(services.map(service => getTablesForService(service, counties))),
        ),
        chain(flattenTables),
        chain(env.irnRepository.addIrnTables),
      )
    }),
  )

export const irnCrawler: IrnCrawler = {
  refreshTables,
  start,
}
