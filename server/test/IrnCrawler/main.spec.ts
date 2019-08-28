import { run } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { actionOf } from "../../../shared/actions"
import { irnCrawler } from "../../src/irnCrawler/main"
import { FindParams, IrnTable } from "../../src/irnFetch/models"
import { Counties, County } from "../../src/irnRepository/models"
import { rndTo } from "../helpers"

describe("IrnCrawler", () => {
  const makeCounty = () => ({
    countyId: rndTo(100),
    districtId: rndTo(100),
  })

  const makeTable = (county: County, tableNumber: number = 1, date: string = "2000-01-01") => ({
    address: "some address",
    county,
    date: new Date(date),
    locationName: "Some location name",
    tableNumber,
    times: ["12:30"],
  })

  interface FetchData {
    input: FindParams
    returnedTables: IrnTable[]
  }

  const stubIrnFetch = (data: FetchData[], counties: Counties) => ({
    find: jest
      .fn()
      .mockImplementation(findParams => actionOf(data.find(d => equals(d.input, findParams))!.returnedTables)),
    getCounties: jest.fn(() => actionOf(counties)),
  })

  describe("start", () => {
    const defaultCrawlerParams = {
      startDate: new Date("0000-01-01"),
    }

    it("persist a single IrnTable", async () => {
      const county = makeCounty()

      const data: FetchData[] = [
        {
          input: { county },
          returnedTables: [makeTable(county)],
        },
      ]
      const irnFetch = stubIrnFetch(data, [county])

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.find).toHaveBeenCalledWith({ county })

      expect(irnRepository.addTables).toHaveBeenCalledWith(data[0].returnedTables)
    })

    it.only("crawls for next available dates on tables", async () => {
      const county = makeCounty()

      const table1Date1 = makeTable(county, 1, "2000-01-01")
      const table1Date2 = makeTable(county, 1, "2000-01-30")
      const table2Date1 = makeTable(county, 2, "2000-01-10")
      const table2Date2 = makeTable(county, 2, "2000-01-20")

      const irnFetch = {
        find: jest
          .fn()
          .mockImplementationOnce(() => actionOf([table1Date1, table2Date1]))
          .mockImplementationOnce(() => actionOf([table2Date1]))
          .mockImplementationOnce(() => actionOf([table1Date2, table2Date2]))
          .mockImplementationOnce(() => actionOf([])),
        getCounties: jest.fn(() => actionOf([county])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.find).toHaveBeenCalledTimes(4)
      expect(irnFetch.find).toHaveBeenCalledWith({ county })
      expect(irnFetch.find).toHaveBeenCalledWith({ county, date: new Date("2000-01-02") })
      expect(irnFetch.find).toHaveBeenCalledWith({ county, date: new Date("2000-01-11") })

      const allTables = [table1Date1, table2Date1, table1Date2, table2Date2]
      expect(irnRepository.addTables).toHaveBeenCalledWith(allTables)
    })

    it("stops crawling after the crawl days limit", async () => {
      const county = makeCounty()

      const dateAfterDateLimit = "2000-01-10"
      const someDate = "2000-03-27"
      const tables = [makeTable(county, 1, dateAfterDateLimit), makeTable(county, 1, someDate)]

      const irnFetch = {
        find: jest.fn().mockImplementationOnce(() => actionOf(tables)),
        getCounties: jest.fn(() => actionOf([county])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        crawlDaysLimit: 10,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start({ startDate: new Date("2000-01-01") }), environment)

      expect(irnFetch.find).toHaveBeenCalledWith({ county })

      expect(irnRepository.addTables).toHaveBeenCalledWith(tables[0])
    })
  })
})
