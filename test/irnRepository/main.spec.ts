import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { irnRepository } from "../../src/irnRepository/local"
import { IrnRepositoryTable } from "../../src/irnRepository/models"

describe("IrnRepository", () => {
  describe("getIrnTables", () => {
    beforeEach(() => {
      irnRepository.clearAllTables()
    })

    const env = {} as any
    const makeTable = (irnTable: Partial<IrnRepositoryTable>): IrnRepositoryTable => {
      const defaultTable = {
        address: "Some Address",
        county: {
          countyId: 3,
          districtId: 2,
          name: "Some name",
        },
        date: new Date("2000-01-01"),
        locationName: "Some Location Name",
        phone: "some-phone",
        postalCode: "some-code",
        serviceId: 1,
        tableNumber: "1",
        times: ["12:30"],
      }

      return {
        ...defaultTable,
        ...irnTable,
      }
    }

    it("filter tables by serviceId", async () => {
      const irnTables = [makeTable({ serviceId: 1 }), makeTable({ serviceId: 2 })]

      irnRepository.addIrnTables(irnTables)

      const result = await run(irnRepository.getIrnTables({ serviceId: 2 }), env)

      pipe(
        result,
        map(v => expect(v).toEqual([irnTables[1]])),
      )
    })

    it("filter tables by districtId", async () => {
      const irnTables = [
        makeTable({ county: { districtId: 1, countyId: 10, name: "Some Name 1" } }),
        makeTable({ county: { districtId: 2, countyId: 20, name: "Some Name 2" } }),
      ]

      irnRepository.addIrnTables(irnTables)

      const result = await run(irnRepository.getIrnTables({ districtId: 2 }), env)

      pipe(
        result,
        map(v => expect(v).toEqual([irnTables[1]])),
      )
    })

    it("filter tables by countyId", async () => {
      const irnTables = [
        makeTable({ county: { districtId: 1, countyId: 10, name: "Some Name 1" } }),
        makeTable({ county: { districtId: 2, countyId: 20, name: "Some Name 2" } }),
      ]

      irnRepository.addIrnTables(irnTables)

      const result = await run(irnRepository.getIrnTables({ countyId: 20 }), env)

      pipe(
        result,
        map(v => expect(v).toEqual([irnTables[1]])),
      )
    })

    describe("filter tables by date", () => {
      const irnTables = [
        makeTable({ date: new Date("2010-01-01") }),
        makeTable({ date: new Date("2010-01-05") }),
        makeTable({ date: new Date("2010-01-10") }),
      ]
      it("with no end limit", async () => {
        irnRepository.addIrnTables(irnTables)

        const result = await run(irnRepository.getIrnTables({ startDate: new Date("2010-01-05") }), env)

        pipe(
          result,
          map(v => expect(v).toEqual([irnTables[1], irnTables[2]])),
        )
      })

      it("with no start limit", async () => {
        irnRepository.addIrnTables(irnTables)

        const result = await run(irnRepository.getIrnTables({ endDate: new Date("2010-01-05") }), env)

        pipe(
          result,
          map(v => expect(v).toEqual([irnTables[0], irnTables[1]])),
        )
      })

      it("with start and end limit", async () => {
        irnRepository.addIrnTables(irnTables)

        const result = await run(
          irnRepository.getIrnTables({ startDate: new Date("2010-01-04"), endDate: new Date("2010-01-06") }),
          env,
        )

        pipe(
          result,
          map(v => expect(v).toEqual([irnTables[1]])),
        )
      })
    })
  })
})
