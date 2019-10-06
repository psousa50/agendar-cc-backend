import { run } from "fp-ts/lib/ReaderTaskEither"
import { equals } from "ramda"
import { irnCrawler } from "../../src/irnCrawler/main"
import { GetIrnTableParams, IrnTable, IrnTables } from "../../src/irnFetch/models"
import { IrnPlace } from "../../src/irnRepository/models"
import { actionErrorOf, actionOf } from "../../src/utils/actions"
import { ServiceError } from "../../src/utils/audit"
import { logDebug } from "../../src/utils/debug"

describe("IrnCrawler", () => {
  const defaultEnvironment = {
    config: {
      crawlDaysLimit: 60,
    },
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

  const makeTable = (irnTable: Partial<IrnTable>): IrnTable => {
    const defaultIrnTable = {
      address: "some address",
      countyId,
      date: new Date("2000-01-01"),
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
      address: "some address",
      countyId,
      districtId,
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
    switchIrnTables: jest.fn(() => actionOf(undefined)),
    upsertIrnPlace: jest.fn(() => actionOf(undefined)),
  }

  interface GetTablesCalls {
    calledWith: GetIrnTableParams
    returns: IrnTables
  }
  const implementFindWith = (getTablesCalls: GetTablesCalls[]) => (params: GetIrnTableParams) => {
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
      startDate: new Date("2000-01-01"),
    }

    it("persist a single IrnTable", async () => {
      const table = makeTable({ date: new Date("2000-01-01") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        ...defaultIrnRepository,
        getCounties: jest.fn(() => actionOf([county])),
        getDistrictRegion: jest.fn(() => actionOf(region)),
        getIrnServices: jest.fn(() => actionOf([service])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      const newIrnPlace = {
        address: table.address,
        countyId: table.countyId,
        districtId: table.districtId,
        gpsLocation: undefined,
        name: table.placeName,
        phone: table.phone,
        postalCode: table.postalCode,
      }

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.clearIrnTablesTemporary).toHaveBeenCalled()
      expect(irnRepository.getDistrictRegion).toHaveBeenCalledWith(districtId)
      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith([table].map(extractIrnRepositoryTable))
      expect(irnRepository.switchIrnTables).toHaveBeenCalled()
      expect(irnRepository.upsertIrnPlace).toHaveBeenCalledWith(newIrnPlace)
    })

    it("persist a tables from multiple services", async () => {
      const serviceId1 = 1
      const service1 = {
        serviceId: serviceId1,
      }
      const serviceId2 = 2
      const service2 = {
        serviceId: serviceId2,
      }
      const tableService1 = makeTable({ serviceId: serviceId1, date: new Date("2000-01-01") })
      const tableService2 = makeTable({ serviceId: serviceId1, date: new Date("2000-01-01") })

      const services = [service1, service2]

      const getTablesCalls = [
        {
          calledWith: { serviceId: serviceId1, countyId, districtId },
          returns: [tableService1],
        },
        {
          calledWith: { serviceId: serviceId1, countyId, districtId, date: new Date("2000-01-02") },
          returns: [],
        },
        {
          calledWith: { serviceId: serviceId2, countyId, districtId },
          returns: [tableService2],
        },
        {
          calledWith: { serviceId: serviceId2, countyId, districtId, date: new Date("2000-01-02") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        ...defaultIrnRepository,
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf(services)),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith(
        [tableService1, tableService2].map(extractIrnRepositoryTable),
      )
    })

    it("crawls for next available dates on a table", async () => {
      const table1Date1 = makeTable({ tableNumber: "1", date: new Date("2000-01-01") })
      const table1Date2 = makeTable({ tableNumber: "1", date: new Date("2000-01-10") })
      const table1Date3 = makeTable({ tableNumber: "1", date: new Date("2000-01-20") })
      const table2Date1 = makeTable({ tableNumber: "2", date: new Date("2000-01-02") })
      const table2Date2 = makeTable({ tableNumber: "2", date: new Date("2000-01-10") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table1Date1, table2Date1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-02") },
          returns: [table1Date2, table2Date1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-03") },
          returns: [table1Date2, table2Date2],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-11") },
          returns: [table1Date3],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-21") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        ...defaultIrnRepository,
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([service])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const allTables = [table1Date1, table2Date1, table1Date2, table2Date2, table1Date3].map(extractIrnRepositoryTable)
      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith(allTables)
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

      const tableCounty1Date1 = makeTable({ countyId: countyId1, date: new Date("2000-01-01") })
      const tableCounty1Date2 = makeTable({ countyId: countyId1, date: new Date("2000-01-11") })
      const tableCounty2Date1 = makeTable({ countyId: countyId2, date: new Date("2000-01-02") })
      const tableCounty2Date2 = makeTable({ countyId: countyId2, date: new Date("2000-01-12") })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId: countyId1, districtId },
          returns: [tableCounty1Date1],
        },
        {
          calledWith: { serviceId, countyId: countyId1, districtId, date: new Date("2000-01-02") },
          returns: [tableCounty1Date2],
        },
        {
          calledWith: { serviceId, countyId: countyId1, districtId, date: new Date("2000-01-12") },
          returns: [],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId },
          returns: [tableCounty2Date1],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId, date: new Date("2000-01-03") },
          returns: [tableCounty2Date2],
        },
        {
          calledWith: { serviceId, countyId: countyId2, districtId, date: new Date("2000-01-13") },
          returns: [],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        ...defaultIrnRepository,
        getCounties: jest.fn(() => actionOf([county1, county2])),
        getIrnServices: jest.fn(() => actionOf([service])),
      } as any

      const environment = {
        ...defaultEnvironment,
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.refreshTables(defaultCrawlerParams), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      const allTables = [tableCounty2Date1, tableCounty2Date2, tableCounty1Date1, tableCounty1Date2].map(
        extractIrnRepositoryTable,
      )
      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith(allTables)
    })

    it("stops crawling after the crawl days limit", async () => {
      const startDate = new Date("2000-01-01")
      const table1 = makeTable({ date: new Date("2000-01-01") })
      const crawlDaysLimit = 10
      const dateAfterDateLimit = new Date("2000-01-12")
      const table2 = makeTable({ date: dateAfterDateLimit })

      const getTablesCalls = [
        {
          calledWith: { serviceId, countyId, districtId },
          returns: [table1],
        },
        {
          calledWith: { serviceId, countyId, districtId, date: new Date("2000-01-02") },
          returns: [table2],
        },
      ]

      const irnFetch = {
        getIrnTables: jest.fn(implementFindWith(getTablesCalls)),
      } as any

      const irnRepository = {
        ...defaultIrnRepository,
        getCounties: jest.fn(() => actionOf([county])),
        getIrnServices: jest.fn(() => actionOf([service])),
      } as any

      const environment = {
        config: {
          crawlDaysLimit,
        },
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.refreshTables({ startDate }), environment)

      expect(irnFetch.getIrnTables).toHaveBeenCalledTimes(getTablesCalls.length)
      getTablesCalls.forEach(c => expect(irnFetch.getIrnTables).toHaveBeenCalledWith(c.calledWith))

      expect(irnRepository.addIrnTablesTemporary).toHaveBeenCalledWith([table1, table2].map(extractIrnRepositoryTable))
    })
  })

  describe("updateIrnPlaces", () => {
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
      } as any

      const environment = {
        ...defaultEnvironment,
        geoCoding: {
          get: jest.fn(() => actionOf(geoCoding)),
        },
        irnRepository,
      } as any

      await run(irnCrawler.updateIrnPlaces(), environment)

      const newIrnPlace1 = {
        ...irnPlace1,
        gpsLocation: geoCoding,
      }
      expect(environment.geoCoding.get).toHaveBeenLastCalledWith(`${irnPlace1.address}+${county.name}`)
      expect(irnRepository.upsertIrnPlace).toHaveBeenLastCalledWith(newIrnPlace1)
    })

    it("do nothing on gps error", async () => {
      const irnPlace1 = makeIrnPlace({ countyId, gpsLocation: undefined })
      const irnPlace2 = makeIrnPlace({ gpsLocation: { latitude: 1, longitude: 2 } })
      const irnRepository = {
        ...defaultIrnRepository,
        getCounty: jest.fn(() => actionOf(county)),
        getIrnPlaces: jest.fn(() => actionOf([irnPlace1, irnPlace2])),
        upsertIrnPlace: jest.fn(() => actionOf(undefined)),
      } as any

      const environment = {
        ...defaultEnvironment,
        geoCoding: {
          get: jest.fn(() => actionErrorOf(new ServiceError("some error"))),
        },
        irnRepository,
      } as any

      await run(irnCrawler.updateIrnPlaces(), environment)

      expect(irnRepository.upsertIrnPlace).not.toHaveBeenCalled()
    })
  })
})
