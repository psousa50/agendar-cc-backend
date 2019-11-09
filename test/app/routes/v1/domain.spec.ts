import { IrnTable } from "../../../../src/irnFetch/models"

import { chain, map, right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { getIrnTableMatch } from "../../../../src/app/routes/v1/domain"
import { GetIrnRepositoryTablesParams } from "../../../../src/irnRepository/models"
import { actionOf } from "../../../../src/utils/actions"
import { DateString, toExistingDateString } from "../../../../src/utils/dates"

describe("getIrnTableMatch", () => {
  const serviceId = 10
  const region = "some region"
  const countyId = 20
  const districtId = 30

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

  it("retrieves soonest first table result with all dates and places", async () => {
    const date1 = toExistingDateString("2000-01-20")
    const place1 = "some place 1"
    const timeSlot1 = "20:00"
    const irnTable1 = makeIrnTable({ date: date1, placeName: place1, timeSlots: [timeSlot1] })

    const tableNumber = "5"
    const soonestDate = toExistingDateString("2000-01-01")
    const place2 = "some place 2"
    const firstTimeSlot = "10:00"
    const timeSlots = [firstTimeSlot, "12:30"]
    const irnTable2 = makeIrnTable({ date: soonestDate, placeName: place2, tableNumber, timeSlots })

    const date3 = toExistingDateString("2000-01-95")
    const place3 = "some place 3"
    const timeSlot3 = "12:30"
    const irnTable3 = makeIrnTable({ date: date3, placeName: place3, timeSlots: [timeSlot3] })

    const getIrnTables = jest.fn(() => actionOf([irnTable1, irnTable2, irnTable3]))

    const environment = {
      irnRepository: {
        getCounty: jest.fn(() => actionOf(undefined)),
        getDistrict: jest.fn(() => actionOf(undefined)),
        getIrnPlace: jest.fn(() => actionOf(undefined)),
        getIrnTables,
      },
    } as any

    const params: GetIrnRepositoryTablesParams = {
      countyId: 10,
      districtId: 20,
      endDate: "2010-09-30" as DateString,
      endTime: "20:00",
      onlyOnSaturdays: true,
      placeName: "Some place name",
      region: "some region",
      serviceId: 1,
      startDate: "2010-09-10" as DateString,
      startTime: "08:00",
    }

    const result = await run(getIrnTableMatch(params), environment)
    const expectedResult = {
      irnTableResults: {
        closest: {
          countyId: irnTable1.countyId,
          date: irnTable1.date,
          districtId: irnTable1.districtId,
          placeName: irnTable1.placeName,
          serviceId: irnTable1.serviceId,
          tableNumber: irnTable1.tableNumber,
          timeSlot: timeSlot1,
        },
        soonest: {
          countyId: irnTable2.countyId,
          date: irnTable2.date,
          districtId: irnTable2.districtId,
          placeName: irnTable2.placeName,
          serviceId: irnTable2.serviceId,
          tableNumber: irnTable2.tableNumber,
          timeSlot: firstTimeSlot,
        },
      },
      otherDates: [date1, soonestDate, date3],
      otherPlaces: [place1, place2, place3],
      otherTimeSlots: [timeSlot1, ...irnTable2.timeSlots],
    }

    expect(getIrnTables).toHaveBeenCalledWith(params)
    expect(result).toEqual(right(expectedResult))
  }),
    it("forwards date and timeSlot params", async () => {
      const getIrnTables = jest.fn(() => actionOf([]))

      const environment = {
        irnRepository: {
          getIrnTables,
        },
      } as any

      const params: GetIrnRepositoryTablesParams = {
        countyId: undefined,
        date: "2010-09-20" as DateString,
        districtId: undefined,
        endDate: undefined,
        endTime: undefined,
        onlyOnSaturdays: false,
        placeName: undefined,
        region: undefined,
        serviceId: undefined,
        startDate: undefined,
        startTime: undefined,
        timeSlot: "10:00",
      }

      const result = await run(getIrnTableMatch(params), environment)
      const expectedResult = {
        irnTableResult: undefined,
        otherDates: [],
        otherPlaces: [],
        otherTimeSlots: [],
      }

      expect(getIrnTables).toHaveBeenCalledWith(params)
      expect(result).toEqual(right(expectedResult))
    })

  describe("filters final result by", () => {
    it("selected date", async () => {
      const date1 = toExistingDateString("2000-01-20")
      const irnTable1 = makeIrnTable({ date: date1 })

      const date2 = toExistingDateString("2000-01-30")
      const irnTable2 = makeIrnTable({ date: date2 })

      const selectedDate = date2
      const getIrnTables = jest.fn(() => actionOf([irnTable1, irnTable2]))

      const environment = {
        irnRepository: {
          getIrnTables,
        },
      } as any

      const params = {
        selectedDate,
      }

      const result = await run(getIrnTableMatch(params), environment)
      const expectedResult = {
        countyId: irnTable2.countyId,
        date: irnTable2.date,
        districtId: irnTable2.districtId,
        placeName: irnTable2.placeName,
        serviceId: irnTable2.serviceId,
        tableNumber: irnTable2.tableNumber,
        timeSlot: irnTable2.timeSlots[0],
      }

      pipe(
        result,
        map(r => expect(r.irnTableResults!.soonest).toEqual(expectedResult)),
      )
    })
  })

  it("selected placeName", async () => {
    const place1 = "Some place 1"
    const irnTable1 = makeIrnTable({ placeName: place1 })

    const place2 = "Some place 2"
    const irnTable2 = makeIrnTable({ countyId, districtId, placeName: place2 })

    const selectedPlace = place2
    const getIrnTables = jest.fn(() => actionOf([irnTable1, irnTable2]))

    const environment = {
      irnRepository: {
        getIrnTables,
      },
    } as any

    const params = {
      selectedCountyId: countyId,
      selectedDistrictId: districtId,
      selectedPlaceName: place2,
    }

    const result = await run(getIrnTableMatch(params), environment)
    const expectedResult = {
      countyId: irnTable2.countyId,
      date: irnTable2.date,
      districtId: irnTable2.districtId,
      placeName: irnTable2.placeName,
      serviceId: irnTable2.serviceId,
      tableNumber: irnTable2.tableNumber,
      timeSlot: irnTable2.timeSlots[0],
    }

    pipe(
      result,
      map(r => expect(r.irnTableResults!.soonest).toEqual(expectedResult)),
    )
  })
})
