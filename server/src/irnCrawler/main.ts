import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, map, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { Action, actionOf, ask } from "../../../shared/actions"
import { IrnTables } from "../irnFetch/models"
import { Counties, County, IrnServices } from "../irnRepository/models"
import { flatten } from "../utils/collections"
import { addDays } from "../utils/dates"
import { IrnCrawler } from "./models"

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
  const fetchNextTables = (county: County, fromDate: Date): Action<void, IrnTables> => () =>
    pipe(
      ask(),
      chain(env => env.irnFetch.getIrnTables({ serviceId, county, date: fromDate })),
      chain(newIrnTables =>
        newIrnTables.length > 0
          ? crawlTableDates(serviceId, dateLimit, fromDate)(merge(irnTables, newIrnTables))
          : actionOf(irnTables),
      ),
    )
  const nextTableToCrawl = findTableWithLowestDate(irnTables.filter(t => t.date > nextDate))

  return nextTableToCrawl && nextTableToCrawl.date <= dateLimit
    ? fetchNextTables(nextTableToCrawl.county, addDays(nextTableToCrawl.date, 1))()
    : actionOf(irnTables)
}

export const irnCrawler: IrnCrawler = {
  start: params =>
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

        const fetchTables = (serviceId: number, counties: Counties) => {
            return counties.map(county => env.irnFetch.getIrnTables({ serviceId, county }))
          }

        const getTablesForService = (serviceId: number, counties: Counties) =>
          pipe(
            rteArraySequence(fetchTables(serviceId, counties)),
            chain(irnTablesPerCounty =>
              rteArraySequence(irnTablesPerCounty.map(crawlTableDates(serviceId, dateLimit))),
            ),
            chain(flattenTables),
          )
        const getTables = (services: IrnServices, counties: Counties) =>
          services.map(service => getTablesForService(service.serviceId, counties))

        const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)
        return pipe(
          getServicesAndCounties(),
          chain(({ services, counties }) => rteArraySequence(getTables(services, counties))),
          chain(flattenTables),
          chain(env.irnRepository.addIrnTables),
        )
      }),
    ),
}
