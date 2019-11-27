import { map, right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { getIrnTableMatch, GetIrnTableMatchParams } from "../../../../src/app/routes/v1/domain"
import {
  GetIrnRepositoryTablesParams,
  IrnRepositoryTable,
  IrnRepositoryTables,
} from "../../../../src/irnRepository/models"
import { actionOf } from "../../../../src/utils/actions"
import { DateString, toDateString, toExistingDateString } from "../../../../src/utils/dates"

describe("getIrnTableMatch", () => {
  const serviceId = 10
  const region = "some region"
  const countyId = 20
  const districtId = 30

  const getEnvironmentFor = (irnTables: IrnRepositoryTables) =>
    ({
      irnRepository: {
        getCounty: jest.fn(() => actionOf(undefined)),
        getDistrict: jest.fn(() => actionOf(undefined)),
        getIrnPlace: jest.fn(() => actionOf(undefined)),
        getIrnTables: jest.fn(() => actionOf(irnTables)),
      },
    } as any)

  const makeIrnTable = (irnTable: Partial<IrnRepositoryTable>): IrnRepositoryTable => {
    const defaultIrnTable: IrnRepositoryTable = {
      countyId,
      date: toExistingDateString("2010-01-01"),
      districtId,
      gpsLocation: { latitude: 0, longitude: 0 },
      placeName: "Some place name",
      region: "Continente",
      serviceId,
      tableNumber: "1",
      timeSlots: ["12:30"],
    }
    return {
      ...defaultIrnTable,
      ...irnTable,
    }
  }

  it("retrieves soonest and closest places", async () => {
    const closestTable = makeIrnTable({ tableNumber: "1", gpsLocation: { latitude: 1.1, longitude: 1.1 } })
    const table1 = makeIrnTable({ tableNumber: "2", gpsLocation: { latitude: 10, longitude: 10 } })
    const soonestTable = makeIrnTable({ tableNumber: "3", date: toExistingDateString("2000-01-01") })
    const table2 = makeIrnTable({ tableNumber: "4", date: toExistingDateString("2015-12-31") })

    const environment = getEnvironmentFor([table1, closestTable, table2, soonestTable])

    const params: GetIrnTableMatchParams = {
      districtId: 1,
      gpsLocation: { latitude: 1, longitude: 1 },
    }

    const result = await run(getIrnTableMatch(params), environment)

    pipe(
      result,
      map(r => {
        expect(r.irnTableResults!.soonest.tableNumber).toBe(soonestTable.tableNumber)
        expect(r.irnTableResults!.closest.tableNumber).toBe(closestTable.tableNumber)
      }),
    )
  })

  it("does not retrieve closest place if district is not defined", async () => {
    const closestTable = makeIrnTable({ tableNumber: "1", gpsLocation: { latitude: 1.1, longitude: 1.1 } })
    const table1 = makeIrnTable({ tableNumber: "2", gpsLocation: { latitude: 10, longitude: 10 } })
    const soonestTable = makeIrnTable({ tableNumber: "3", date: toExistingDateString("2000-01-01") })
    const table2 = makeIrnTable({ tableNumber: "4", date: toExistingDateString("2015-12-31") })

    const environment = getEnvironmentFor([table1, closestTable, table2, soonestTable])

    const params: GetIrnTableMatchParams = {
      gpsLocation: { latitude: 1, longitude: 1 },
    }

    const result = await run(getIrnTableMatch(params), environment)

    pipe(
      result,
      map(r => {
        expect(r.irnTableResults!.soonest).toEqual(r.irnTableResults!.closest)
      }),
    )
  })

  it("returns all dates of selected tables", async () => {
    const date1 = toDateString("2010-01-01")
    const date2 = toDateString("2010-01-05")
    const table1 = makeIrnTable({ date: date1 })
    const table2 = makeIrnTable({ date: date2 })

    const environment = getEnvironmentFor([table1, table2])

    const result = await run(getIrnTableMatch({}), environment)

    pipe(
      result,
      map(r => {
        expect(r.otherDates).toEqual([date1, date2])
      }),
    )
  })

  it("returns all places of selected tables", async () => {
    const place1 = "Some place 1"
    const place2 = "Some place 2"
    const table1 = makeIrnTable({ placeName: place1 })
    const table2 = makeIrnTable({ placeName: place2 })

    const environment = getEnvironmentFor([table1, table2])

    const result = await run(getIrnTableMatch({}), environment)

    pipe(
      result,
      map(r => {
        expect(r.otherPlaces).toEqual([place1, place2])
      }),
    )
  })

  it("returns all timeslots of selected tables", async () => {
    const timeSlots1 = ["08:00", "09:00"]
    const timeSlots2 = ["10:00", "11:00"]
    const table1 = makeIrnTable({ timeSlots: timeSlots1 })
    const table2 = makeIrnTable({ timeSlots: timeSlots2 })

    const environment = getEnvironmentFor([table1, table2])

    const result = await run(getIrnTableMatch({}), environment)

    pipe(
      result,
      map(r => {
        expect(r.otherTimeSlots).toEqual(timeSlots1.concat(timeSlots2))
      }),
    )
  })

  it("removes locations params if distanceRadius is included", async () => {
    const environment = getEnvironmentFor([])

    const params = {
      countyId: 2,
      distanceRadiusKm: 10,
      districtId: 1,
      other: "param",
      placeName: "some place",
    }

    await run(getIrnTableMatch(params), environment)

    const expectedParams = {
      distanceRadiusKm: 10,
      other: "param",
    }

    expect(environment.irnRepository.getIrnTables).toHaveBeenCalledWith(expectedParams)
  })

  describe("filters final result by", () => {
    it("selected date", async () => {
      const date1 = toExistingDateString("2000-01-20")
      const irnTable1 = makeIrnTable({ tableNumber: "1", date: date1 })

      const date2 = toExistingDateString("2000-01-30")
      const irnTable2 = makeIrnTable({ tableNumber: "2", date: date2 })
      const selectedDate = date2

      const environment = getEnvironmentFor([irnTable1, irnTable2])

      const params = {
        selectedDate,
      }

      const result = await run(getIrnTableMatch(params), environment)

      pipe(
        result,
        map(r => {
          expect(r.irnTableResults!.soonest.tableNumber).toEqual(irnTable2.tableNumber)
          expect(r.otherDates).toEqual([irnTable2.date])
        }),
      )
    })

    it("selected placeName", async () => {
      const place1 = "Some place 1"
      const irnTable1 = makeIrnTable({ tableNumber: "1", placeName: place1 })

      const place2 = "Some place 2"
      const irnTable2 = makeIrnTable({ tableNumber: "2", countyId, districtId, placeName: place2 })

      const selectedPlaceName = place2
      const environment = getEnvironmentFor([irnTable1, irnTable2])

      const params = {
        selectedCountyId: countyId,
        selectedDistrictId: districtId,
        selectedPlaceName,
      }

      const result = await run(getIrnTableMatch(params), environment)

      pipe(
        result,
        map(r => {
          expect(r.irnTableResults!.soonest.tableNumber).toEqual(irnTable2.tableNumber)
          expect(r.otherPlaces).toEqual([irnTable2.placeName])
        }),
      )
    })
  })
})
