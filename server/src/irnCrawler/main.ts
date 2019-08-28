import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { Action, actionOf, ask } from "../../../shared/actions"
import { IrnTables } from "../irnFetch/models"
import { Counties, County } from "../irnRepository/models"
import { addDays } from "../utils/dates"
import { IrnCrawler } from "./models"

const rteArraySequence = array.sequence(readerTaskEither)

const merge = (irnTables: IrnTables, toMerge: IrnTables) =>
  toMerge.reduce((acc, table) => (acc.findIndex(t => equals(t, table)) < 0 ? [...acc, table] : acc), irnTables)

const findTableWithLowestDate = (irnTables: IrnTables) =>
  irnTables.reduce((acc, t) => (acc && acc.date < t.date ? acc : t), irnTables[0] || undefined)

const crawlTableDates = (startDate: Date, nextDate?: Date): Action<IrnTables, IrnTables> => irnTables => {

  const fetchNextTables = (county: County, fromDate: Date): Action<void, IrnTables> => () =>
    pipe(
      ask(),
      chain(env => env.irnFetch.find({ county, date: fromDate })),
      chain(newIrnTables =>
        newIrnTables.length > 0
          ? crawlTableDates(startDate, fromDate)(merge(irnTables, newIrnTables))
          : actionOf(irnTables),
      ),
    )

  const nextTableToCrawl = findTableWithLowestDate(irnTables.filter(t => t.date > (nextDate || new Date(0))))

  return nextTableToCrawl
    ? fetchNextTables(nextTableToCrawl.county, addDays(nextTableToCrawl.date, 1))()
    : actionOf(irnTables)
}

export const irnCrawler: IrnCrawler = {
  start: params =>
    pipe(
      ask(),
      chain(env => {
        const fetchTables = (counties: Counties) => {
          return counties.map(county => env.irnFetch.find({ county }))
        }

        return pipe(
          env.irnFetch.getCounties(),
          chain(county => rteArraySequence(fetchTables(county))),
          chain(irnTables => actionOf(irnTables.reduce((acc, cur) => [...acc, ...cur], []))),
          chain(crawlTableDates(params.startDate)),
          chain(env.irnRepository.addTables),
        )
      }),
    ),
}
