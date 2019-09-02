import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { Action, actionOf, ask } from "../../../shared/actions"
import { IrnTables } from "../irnFetch/models"
import { Counties, County } from "../irnRepository/models"
import { flatten } from "../utils/collections"
import { addDays } from "../utils/dates"
import { IrnCrawler } from "./models"

const rteArraySequence = array.sequence(readerTaskEither)

const merge = (irnTables: IrnTables, toMerge: IrnTables) =>
  toMerge.reduce((acc, table) => (acc.findIndex(t => equals(t, table)) < 0 ? [...acc, table] : acc), irnTables)

const flattenTables: Action<IrnTables[], IrnTables> = irnTablesArray => actionOf(flatten(irnTablesArray))

const findTableWithLowestDate = (irnTables: IrnTables) =>
  irnTables.reduce((acc, t) => (acc && acc.date <= t.date ? acc : t), irnTables[0] || undefined)

const crawlTableDates = (dateLimit: Date, nextDate: Date = new Date(0)): Action<IrnTables, IrnTables> => irnTables => {
  const fetchNextTables = (county: County, fromDate: Date): Action<void, IrnTables> => () =>
    pipe(
      ask(),
      chain(env => env.irnFetch.getIrnTables({ county, date: fromDate })),
      chain(newIrnTables =>
        newIrnTables.length > 0
          ? crawlTableDates(dateLimit, fromDate)(merge(irnTables, newIrnTables))
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
        const fetchTables = (counties: Counties) => {
          return counties.map(county => env.irnFetch.getIrnTables({ county }))
        }

        const dateLimit = addDays(params.startDate, env.config.crawlDaysLimit)
        return pipe(
          env.irnFetch.getCounties(),
          chain(counties => rteArraySequence(fetchTables(counties))),
          chain(irnTablesPerCounty => rteArraySequence(irnTablesPerCounty.map(crawlTableDates(dateLimit)))),
          chain(flattenTables),
          chain(env.irnRepository.addIrnTables),
        )
      }),
    ),
}
