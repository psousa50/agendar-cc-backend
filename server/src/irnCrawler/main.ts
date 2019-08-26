import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, readerTaskEither } from "fp-ts/lib/ReaderTaskEither"
import pipeP from "ramda/es/pipeP"
import { Action, actionOf, ask } from "../../../shared/actions"
import { IrnFetch } from "../irnFetch/models"
import { Counties, IrnRepository } from "../irnRepository/models"

const rteArraySequence = array.sequence(readerTaskEither)

interface IrnCrawler {
  start: Action<void, void>
}

export const irnCrawler = {
  start: () => pipe(
    ask(),
    chain(env => {
      const fetchTables = (counties: Counties) => {
        return counties.map(c => env.irnFetch.find({ districtId: c.districtId, countyId: c.countyId }))
      }

      const tables = pipe(
        env.irnFetch.getCounties(),
        chain(c => rteArraySequence(fetchTables(c))),
        chain(t => actionOf(t.reduce((acc, cur) => [...acc, ...cur], []))),
        chain(env.irnRepository.addTables),
      )

      return tables
    }),
  ),
}
