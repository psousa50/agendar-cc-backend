import { run } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { actionOf } from "../../../shared/actions"
import { irnCrawler } from "../../src/irnCrawler/main"
import { getTableParams, IrnTable, IrnTables } from "../../src/irnFetch/models"
import { County } from "../../src/irnRepository/models"
import { rndTo } from "../helpers"

describe("IrnCrawler", () => {
  const defaultEnvironment = {
    config: {
      crawlDaysLimit: 60,
    },
  }

  const someServiceId = 1
  const someService = {
    serviceId: someServiceId,
  } as any

  const makeCounty = (c = rndTo(100)) => ({
    countyId: c,
    countyName: `County ${c}`,
    districtId: c,
  })

  const makeTable = (
    serviceId: number,
    county: County,
    tableNumber: string = "1",
    date: string = "2000-01-01",
  ): IrnTable => ({
    address: "some address",
    county,
    date: new Date(date),
    locationName: "Some location name",
    phone: "",
    postalCode: "",
    serviceId,
    tableNumber,
    times: ["12:30"],
  })

  interface GetTablesCalls {
    calledWith: getTableParams
    returns: IrnTables
  }
  const implementFindWith = (getTablesCalls: GetTablesCalls[]) => (params: getTableParams) => {
    const call = getTablesCalls.find(c => equals(c.calledWith, params))
    return call ? actionOf(call.returns) : (console.log("Call Not Found:", params), actionOf([]))
  }

  describe("start", () => {
    const defaultCrawlerParams = {
      startDate: new Date("2000-01-01"),
    }

    it("persist a single IrnTable", async () => {
      const county = makeCounty()
      const table = makeTable(someServiceId, county, "1", "2000-01-01")

      const getTablesCalls = [
        {
          calledWith: { serviceId: someServiceId, county },
          returns: [table],
        },
        {
          calledWith: { serviceId: someServiceId, county, date: new Date("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        addIrnTables: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([someService])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTables).toHaveBeenCalledWith([table])
    })

    it("persist a tables from multiple services", async () => {
      const county = makeCounty()
      const serviceId1 = 1
      const serviceId2 = 2
      const tableService1 = makeTable(serviceId1, county, "1", "2000-01-01")
      const tableService2 = makeTable(serviceId1, county, "1", "2000-01-01")

      const services = [
        {
        serviceId: serviceId1,
      },
        {
        serviceId: serviceId2,
      },
    ]
      const getTablesCalls = [
        {
          calledWith: { serviceId: serviceId1, county },
          returns: [tableService1],
        },
        {
          calledWith: { serviceId: serviceId1, county, date: new Date("2000-01-02") },
          returns: [],
        },
        {
          calledWith: { serviceId: serviceId2, county },
          returns: [tableService2],
        },
        {
          calledWith: { serviceId: serviceId2, county, date: new Date("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        addIrnTables: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf(services)),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTables).toHaveBeenCalledWith([tableService1, tableService2])
    })

    it("crawls for next available dates on a table", async () => {
      const county = makeCounty()

      const table1Date1 = makeTable(someServiceId, county, "1", "2000-01-01")
      const table1Date2 = makeTable(someServiceId, county, "1", "2000-01-30")
      const table2Date1 = makeTable(someServiceId, county, "2", "2000-01-10")
      const table2Date2 = makeTable(someServiceId, county, "2", "2000-01-20")

      const getTablesCalls = [
        {
          calledWith: { serviceId: someServiceId, county },
          returns: [table1Date1, table2Date1],
        },
        {
          calledWith: { serviceId: someServiceId, county, date: new Date("2000-01-02") },
          returns: [table2Date1],
        },
        {
          calledWith: { serviceId: someServiceId, county, date: new Date("2000-01-11") },
          returns: [table1Date2, table2Date2],
        },
        {
          calledWith: { serviceId: someServiceId, county, date: new Date("2000-01-21") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        addIrnTables: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([someService])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const allTables = [table1Date1, table2Date1, table1Date2, table2Date2]
      expect(irnRepository.addIrnTables).toHaveBeenCalledWith(allTables)
    })

    it("crawls for next available dates on multiple counties", async () => {
      const county1 = makeCounty(1)
      const county2 = makeCounty(2)

      const tableCounty1Date1 = makeTable(someServiceId, county1, "1", "2000-01-01")
      const tableCounty1Date2 = makeTable(someServiceId, county1, "1", "2000-01-11")
      const tableCounty2Date1 = makeTable(someServiceId, county2, "1", "2000-01-02")
      const tableCounty2Date2 = makeTable(someServiceId, county2, "1", "2000-01-12")

      const getTablesCalls = [
        {
          calledWith: { serviceId: someServiceId, county: county1 },
          returns: [tableCounty1Date1],
        },
        {
          calledWith: { serviceId: someServiceId, county: county1, date: new Date("2000-01-02") },
          returns: [tableCounty1Date2],
        },
        {
          calledWith: { serviceId: someServiceId, county: county1, date: new Date("2000-01-12") },
          returns: [],
        },
        {
          calledWith: { serviceId: someServiceId, county: county2 },
          returns: [tableCounty2Date1],
        },
        {
          calledWith: { serviceId: someServiceId, county: county2, date: new Date("2000-01-03") },
          returns: [tableCounty2Date2],
        },
        {
          calledWith: { serviceId: someServiceId, county: county2, date: new Date("2000-01-13") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        addIrnTables: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county1, county2])),
        getIrnServices: jest.fn(() => actionOf([someService])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const allTables = [tableCounty1Date1, tableCounty1Date2, tableCounty2Date1, tableCounty2Date2]
      expect(irnRepository.addIrnTables).toHaveBeenCalledWith(allTables)
    })

    it("stops crawling after the crawl days limit", async () => {
      const county = makeCounty()

      const startDate = new Date("2000-01-01")
      const table1 = makeTable(someServiceId, county, "1", "2000-01-01")
      const crawlDaysLimit = 10
      const dateAfterDateLimit = "2000-01-12"
      const table2 = makeTable(someServiceId, county, "1", dateAfterDateLimit)

      const getTablesCalls = [
        {
          calledWith: { serviceId: someServiceId, county },
          returns: [table1],
        },
        {
          calledWith: { serviceId: someServiceId, county, date: new Date("2000-01-02") },
          returns: [table2],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        addIrnTables: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([someService])),
      } as any

      const environment = {
        config: {
          crawlDaysLimit,
        },
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start({ startDate }), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTables).toHaveBeenCalledWith([table1, table2])
    })
  })
})
