import { run } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { actionOf } from "../../../shared/actions"
import { irnCrawler } from "../../src/irnCrawler/main"
import { FindParams, IrnTable, IrnTables } from "../../src/irnFetch/models"
import { County } from "../../src/irnRepository/models"
import { rndTo } from "../helpers"

describe("IrnCrawler", () => {
  const defaultEnvironment = {
    config: {
      crawlDaysLimit: 60,
    },
  }
  const makeCounty = (c = rndTo(100)) => ({
    countyId: c,
    districtId: c,
  })

  const makeTable = (county: County, tableNumber: string = "1", date: string = "2000-01-01"): IrnTable => ({
    address: "some address",
    county,
    date: new Date(date),
    locationName: "Some location name",
    phone: "",
    postalCode: "",
    tableNumber,
    times: ["12:30"],
  })

  interface FindCall {
    calledWith: FindParams
    returns: IrnTables
  }
  const implementFindWith = (findCalls: FindCall[]) => (params: FindParams) => {
    const call = findCalls.find(c => equals(c.calledWith, params))
    return call ? actionOf(call.returns) : (console.log("Call Not Found:", params), actionOf([]))
  }

  describe("start", () => {
    const defaultCrawlerParams = {
      startDate: new Date("2000-01-01"),
    }

    it("persist a single IrnTable", async () => {
      const county = makeCounty()
      const table = makeTable(county, "1", "2000-01-01")

      const findCalls = [
        {
          calledWith: { county },
          returns: [table],
        },
        {
          calledWith: { county, date: new Date("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        find: jest.fn(implementFindWith(findCalls)),
        getCounties: jest.fn(() => actionOf([county])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.find).toHaveBeenCalledTimes(findCalls.length)
      findCalls.forEach(c => expect(irnFetch.find).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addTables).toHaveBeenCalledWith([table])
    })

    it("crawls for next available dates on a table", async () => {
      const county = makeCounty()

      const table1Date1 = makeTable(county, "1", "2000-01-01")
      const table1Date2 = makeTable(county, "1", "2000-01-30")
      const table2Date1 = makeTable(county, "2", "2000-01-10")
      const table2Date2 = makeTable(county, "2", "2000-01-20")

      const findCalls = [
        {
          calledWith: { county },
          returns: [table1Date1, table2Date1],
        },
        {
          calledWith: { county, date: new Date("2000-01-02") },
          returns: [table2Date1],
        },
        {
          calledWith: { county, date: new Date("2000-01-11") },
          returns: [table1Date2, table2Date2],
        },
        {
          calledWith: { county, date: new Date("2000-01-21") },
          returns: [],
        },
      ]

      const irnFetch = {
        find: jest.fn(implementFindWith(findCalls)),
        getCounties: jest.fn(() => actionOf([county])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.find).toHaveBeenCalledTimes(findCalls.length)
      findCalls.forEach(c => expect(irnFetch.find).toHaveBeenCalledWith(c.calledWith))

      const allTables = [table1Date1, table2Date1, table1Date2, table2Date2]
      expect(irnRepository.addTables).toHaveBeenCalledWith(allTables)
    })

    it("crawls for next available dates on multiple counties", async () => {
      const county1 = makeCounty(1)
      const county2 = makeCounty(2)

      const tableCounty1Date1 = makeTable(county1, "1", "2000-01-01")
      const tableCounty1Date2 = makeTable(county1, "1", "2000-01-11")
      const tableCounty2Date1 = makeTable(county2, "1", "2000-01-02")
      const tableCounty2Date2 = makeTable(county2, "1", "2000-01-12")

      const findCalls = [
        {
          calledWith: { county: county1 },
          returns: [tableCounty1Date1],
        },
        {
          calledWith: { county: county1, date: new Date("2000-01-02") },
          returns: [tableCounty1Date2],
        },
        {
          calledWith: { county: county1, date: new Date("2000-01-12") },
          returns: [],
        },
        {
          calledWith: { county: county2 },
          returns: [tableCounty2Date1],
        },
        {
          calledWith: { county: county2, date: new Date("2000-01-03") },
          returns: [tableCounty2Date2],
        },
        {
          calledWith: { county: county2, date: new Date("2000-01-13") },
          returns: [],
        },
      ]

      const irnFetch = {
        find: jest.fn(implementFindWith(findCalls)),
        getCounties: jest.fn(() => actionOf([county1, county2])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.find).toHaveBeenCalledTimes(findCalls.length)
      findCalls.forEach(c => expect(irnFetch.find).toHaveBeenCalledWith(c.calledWith))

      const allTables = [tableCounty1Date1, tableCounty1Date2, tableCounty2Date1, tableCounty2Date2]
      expect(irnRepository.addTables).toHaveBeenCalledWith(allTables)
    })

    it("stops crawling after the crawl days limit", async () => {
      const county = makeCounty()

      const startDate = new Date("2000-01-01")
      const table1 = makeTable(county, "1", "2000-01-01")
      const crawlDaysLimit = 10
      const dateAfterDateLimit = "2000-01-12"
      const table2 = makeTable(county, "1", dateAfterDateLimit)

      const findCalls = [
        {
          calledWith: { county },
          returns: [table1],
        },
        {
          calledWith: { county, date: new Date("2000-01-02") },
          returns: [table2],
        },
      ]

      const irnFetch = {
        find: jest.fn(implementFindWith(findCalls)),
        getCounties: jest.fn(() => actionOf([county])),
      }

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        config: {
          crawlDaysLimit,
        },
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start({ startDate }), environment)

      expect(irnFetch.find).toHaveBeenCalledTimes(findCalls.length)
      findCalls.forEach(c => expect(irnFetch.find).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addTables).toHaveBeenCalledWith([table1, table2])
    })
  })
})
