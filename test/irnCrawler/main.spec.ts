import { run } from "fp-ts/lib/ReaderTaskEither"
import { equals, flatten, sort } from "ramda"
import { irnCrawler } from "../../src/irnCrawler/main"
import { FetchIrnTablesParams, IrnTable, IrnTables } from "../../src/irnFetch/models"
import { IrnPlace, IrnRepositoryTables } from "../../src/irnRepository/models"
import { actionErrorOf, actionOf } from "../../src/utils/actions"
import { ServiceError } from "../../src/utils/audit"
import { toExistingDateString } from "../../src/utils/dates"
import { logDebug } from "../../src/utils/debug"

describe("IrnCrawler", () => {
  const defaultEnvironment = {
    config: {
      crawlDaysLimit: 60,
    },
    log: () => undefined,
    now: () => 0,
  }

  const serviceId = 10
  const region = "some region"
  const countyId = 20
  const districtId = 30
  const county = {
    countyId,
    districtId,
    name: "Some County name",
  }
  const service = {
    serviceId,
  }

  const sortIrnTables = (irnTables: IrnRepositoryTables) => sort((t1, t2) => t1.countyId - t2.countyId, irnTables)
  const makeIrnTable = (irnTable: Partial<IrnTable>): IrnTable => {
    const defaultIrnTable = {
      address: "some address",
      countyId,
      date: toExistingDateString("2000-01-01"),
      districtId,
      phone: "",
      placeName: "Some place name",
      postalCode: "",
      serviceId,
      tableNumber: "1",
      timeSlots: ["12:30"],
    }

    return {
      ...defaultIrnTable,
      ...irnTable,
    }
  }

  const makeIrnPlace = (irnPlace: Partial<IrnPlace>): IrnPlace => {
    const defaultIrnPlace = {
      active: true,
      address: "some address",
      countyId,
      districtId,
      lastUpdatedTimestamp: 0,
      name: "Some place name",
      phone: "spme phone",
      postalCode: "some postal code",
    }

    return {
      ...defaultIrnPlace,
      ...irnPlace,
    }
  }

  const defaultIrnRepository = {
    addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
    clearIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
    getCounties: jest.fn(() => actionOf([])),
    getDistrictRegion: jest.fn(() => actionOf(region)),
    getIrnPlace: jest.fn(() => actionOf(null)),
    getIrnServices: jest.fn(() => actionOf([])),
    getIrnTablesCount: jest.fn(() => actionOf(100)),
    getIrnTablesTemporaryCount: jest.fn(() => actionOf(100)),
    switchIrnTables: jest.fn(() => actionOf(undefined)),
    upsertIrnPlace: jest.fn(() => actionOf(undefined)),
  }

  interface GetTablesCalls {
    calledWith: FetchIrnTablesParams
    returns: IrnTables
  }
  const implementFindWith = (getTablesCalls: GetTablesCalls[]) => (params: FetchIrnTablesParams) => {
    const call = getTablesCalls.find(c => equals(c.calledWith, params))
    return call ? actionOf(call.returns) : (logDebug("Call Not Found:", params), actionOf([]))
  }

  const extractIrnRepositoryTable = (irnTable: IrnTable) => ({
    countyId: irnTable.countyId,
    date: irnTable.date,
    districtId: irnTable.districtId,
    placeName: irnTable.placeName,
    region,
    serviceId: irnTable.serviceId,
    tableNumber: irnTable.tableNumber,
    timeSlots: irnTable.timeSlots,
  })

  describe("refreshTables", () => {
    const defaultCrawlerParams = {
      startDate: toExistingDateString("2000-01-01"),
    }

    it("persist a single IrnTable", async () => {
      const table = makeIrnTable({ date: toExistingDateString("2000-01-01") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        clearIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getDistrictRegion: jest.fn(() => actionOf(region)),
        getIrnServices: jest.fn(() => actionOf([service])),
        switchIrnTables: jest.fn(() => actionOf(undefined)),
        upsertIrnPlace: jest.fn(() => actionOf(undefined)),
      }

      const now = 10000
      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
        now: () => now,
      }

      const newIrnPlace = {
        address: table.address,
        countyId: table.countyId,
        districtId: table.districtId,
        gpsLocation: undefined,
        lastUpdatedTimestamp: now,
        name: table.placeName,
        phone: table.phone,
        postalCode: table.postalCode,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment as any)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.clearIrnTablesTemporary).toHaveBeenCalled()
      expect(irnRepository.getDistrictRegion).toHaveBeenCalledWith(districtId)
      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith([table].map(extractIrnRepositoryTable))
      expect(irnRepository.switchIrnTables).toHaveBeenCalled()
      expect(irnRepository.upsertIrnPlace).toHaveBeenCalledWith(newIrnPlace)
    })

    it("persist tables from multiple services", async () => {
      const serviceId1 = 1
      const service1 = {
        serviceId: serviceId1,
      }
      const serviceId2 = 2
      const service2 = {
        serviceId: serviceId2,
      }
      const tableService1 = makeIrnTable({ serviceId: serviceId1, date: toExistingDateString("2000-01-01") })
      const tableService2 = makeIrnTable({ serviceId: serviceId1, date: toExistingDateString("2000-01-01") })

      const services = [service1, service2]

      const getTablesCalls = [
        {
          calledWith: { serviceId: serviceId1, countyId, districtId },
          returns: [tableService1],
        },
        {
          calledWith: { serviceId: serviceId1, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [],
        },
        {
          calledWith: { serviceId: serviceId2, countyId, districtId },
          returns: [tableService2],
        },
        {
          calledWith: { serviceId: serviceId2, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf(services)),
      }

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment as any)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith([tableService1].map(extractIrnRepositoryTable))
      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith([tableService2].map(extractIrnRepositoryTable))
    })

    it("crawls for next available dates on a table", async () => {
      const table1Date1 = makeIrnTable({ tableNumber: "1", date: toExistingDateString("2000-01-01") })
      const table1Date2 = makeIrnTable({ tableNumber: "1", date: toExistingDateString("2000-01-10") })
      const table1Date3 = makeIrnTable({ tableNumber: "1", date: toExistingDateString("2000-01-20") })
      const table2Date1 = makeIrnTable({ tableNumber: "2", date: toExistingDateString("2000-01-02") })
      const table2Date2 = makeIrnTable({ tableNumber: "2", date: toExistingDateString("2000-01-10") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table1Date1, table2Date1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [table1Date2, table2Date1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-03") },
          returns: [table1Date2, table2Date2],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-11") },
          returns: [table1Date3],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-21") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([service])),
      }

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment as any)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const expectedTablesAdded = [
        table1Date1,
        table2Date1,
        table1Date2,
        table2Date1,
        table1Date2,
        table2Date2,
        table1Date3,
      ].map(extractIrnRepositoryTable)
      const actualTablesAdded = flatten(irnRepository.addIrnTablesTemporary.mock.calls.map(a => (a as any)[0]))

      expect(sortIrnTables(actualTablesAdded)).toEqual(sortIrnTables(expectedTablesAdded))
    })

    it("crawls for next available dates on multiple counties", async () => {
      const countyId1 = 1
      const countyId2 = 2
      const county1 = {
        countyId: countyId1,
        districtId,
      }
      const county2 = {
        countyId: countyId2,
        districtId,
      }

      const tableCounty1Date1 = makeIrnTable({ countyId: countyId1, date: toExistingDateString("2000-01-01") })
      const tableCounty1Date2 = makeIrnTable({ countyId: countyId1, date: toExistingDateString("2000-01-11") })
      const tableCounty2Date1 = makeIrnTable({ countyId: countyId2, date: toExistingDateString("2000-01-02") })
      const tableCounty2Date2 = makeIrnTable({ countyId: countyId2, date: toExistingDateString("2000-01-12") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId: countyId1, districtId },
          returns: [tableCounty1Date1],
        },
        {
          calledWith: { serviceId, countyId: countyId1, districtId, date: toExistingDateString("2000-01-02") },
          returns: [tableCounty1Date2],
        },
        {
          calledWith: { serviceId, countyId: countyId1, districtId, date: toExistingDateString("2000-01-12") },
          returns: [],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId },
          returns: [tableCounty2Date1],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId, date: toExistingDateString("2000-01-03") },
          returns: [tableCounty2Date2],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId, date: toExistingDateString("2000-01-13") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county1, county2])),
        getIrnServices: jest.fn(() => actionOf([service])),
      }

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment as any)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const expectedTablesAdded = [tableCounty2Date1, tableCounty2Date2, tableCounty1Date1, tableCounty1Date2].map(
        extractIrnRepositoryTable,
      )
      const actualTablesAdded = flatten(irnRepository.addIrnTablesTemporary.mock.calls.map(a => (a as any)[0]))

      expect(sortIrnTables(actualTablesAdded)).toEqual(sortIrnTables(expectedTablesAdded))
    })

    it("stops crawling after the crawl days limit", async () => {
      const startDate = toExistingDateString("2000-01-01")
      const table1 = makeIrnTable({ date: toExistingDateString("2000-01-01") })
      const crawlDaysLimit = 10
      const dateAfterDateLimit = toExistingDateString("2000-01-12")
      const table2 = makeIrnTable({ date: dateAfterDateLimit })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [table2],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([service])),
      }

      const environment = {
        ...defaultEnvironment,
        config: {
          crawlDaysLimit,
        },
        irnFetch,
        irnRepository,
      }

      await run(irnCrawler.refreshTables({ startDate }), environment as any)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))
    })

    it("does not switch tables if new tables count is to low", async () => {
      const table = makeIrnTable({ date: toExistingDateString("2000-01-01") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: toExistingDateString("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      }

      const irnRepository = {
        ...defaultIrnRepository,
        addIrnTablesTemporary: jest.fn(() => actionOf(undefined)),
        getIrnTablesCount: jest.fn(() => actionOf(100)),
        getIrnTablesTemporaryCount: jest.fn(() => actionOf(29)),
        switchIrnTables: jest.fn(() => actionOf(undefined)),
      }

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment as any)

      expect(irnRepository.switchIrnTables).not.toHaveBeenCalled()
    })
  })

  describe("updateIrnPlacesLocation", () => {
    it("updates gpsLocation for each irnPlace that doesn't have it", async () => {
      const geoCoding = {
        latitude: 10,
        longitude: 20,
      }
      const irnPlace1 = makeIrnPlace({ countyId, gpsLocation: undefined })
      const irnPlace2 = makeIrnPlace({ gpsLocation: { latitude: 1, longitude: 2 } })
      const irnRepository = {
        ...defaultIrnRepository,
        getCounty: jest.fn(() => actionOf(county)),
        getIrnPlaces: jest.fn(() => actionOf([irnPlace1, irnPlace2])),
        upsertIrnPlace: jest.fn(() => actionOf(undefined)),
      }

      const environment = {
        ...defaultEnvironment,
        geoCoding: {
          get: jest.fn(() => actionOf(geoCoding)),
        },
        irnRepository,
      }

      await run(irnCrawler.updateIrnPlacesLocation(), environment as any)

      const newIrnPlace1 = {
        ...irnPlace1,
        gpsLocation: geoCoding,
      }

      expect(environment.geoCoding.get).toHaveBeenCalledTimes(1)
      expect(environment.geoCoding.get).toHaveBeenLastCalledWith(`${irnPlace1.address}+${county.name}`)
      expect(irnRepository.upsertIrnPlace).toHaveBeenLastCalledWith(newIrnPlace1)
    })

    it("do nothing and continue on gps error", async () => {
      const geoCoding = {
        latitude: 10,
        longitude: 20,
      }
      const irnPlace1 = makeIrnPlace({ countyId, gpsLocation: undefined })
      const irnPlace2 = makeIrnPlace({ countyId, gpsLocation: undefined })
      const irnRepository = {
        ...defaultIrnRepository,
        getCounty: jest.fn(() => actionOf(county)),
        getIrnPlaces: jest.fn(() => actionOf([irnPlace1, irnPlace2])),
        upsertIrnPlace: jest.fn(() => actionOf(undefined)),
      }

      const environment = {
        ...defaultEnvironment,
        geoCoding: {
          get: jest
            .fn()
            .mockImplementationOnce(() => actionErrorOf(new ServiceError("some error")))
            .mockImplementationOnce(() => actionOf(geoCoding)),
        },
        irnRepository,
      }

      await run(irnCrawler.updateIrnPlacesLocation(), environment as any)

      expect(irnRepository.upsertIrnPlace).toHaveBeenCalledTimes(1)
    })
  })
})
