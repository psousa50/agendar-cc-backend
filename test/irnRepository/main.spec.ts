import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { irnRepository } from "../../src/irnRepository/local"
import { IrnRepositoryTable } from "../../src/irnRepository/models"

describe("IrnRepository", () => {
  describe("getIrnTables", () => {
    beforeEach(() => {
      irnRepository.clearIrnTablesTemporary()
    })

    const env = {} as any
    const makeTable = (irnTable: Partial<IrnRepositoryTable>): IrnRepositoryTable => {
      const defaultTable = {
        address: "Some Address",
        countyId: 20,
        date: new Date("2000-01-01"),
        districtId: 30,
        phone: "some-phone",
        placeName: "Some place name",
        postalCode: "some-code",
        serviceId: 10,
        tableNumber: "1",
        timeSlots: ["12:30"],
      }

      return {
        ...defaultTable,
        ...irnTable,
      }
    }

    it("filter tables by serviceId", async () => {
      const irnTables = [makeTable({ serviceId: 1 }), makeTable({ serviceId: 2 })]

      irnRepository.addIrnTablesTemporary(irnTables)

      const result = await run(irnRepository.getIrnTables({ serviceId: 2 }), env)

      pipe(
        result,
        map(v => expect(v).toEqual([irnTables[1]])),
      )
    })

    it("filter tables by districtId", async () => {
      const irnTables = [makeTable({ districtId: 1, countyId: 10 }), makeTable({ districtId: 2, countyId: 20 })]

      irnRepository.addIrnTablesTemporary(irnTables)

      const result = await run(irnRepository.getIrnTables({ districtId: 2 }), env)

      pipe(
        result,
        map(v => expect(v).toEqual([irnTables[1]])),
      )
    })

    it("filter tables by countyId", async () => {
      const irnTables = [makeTable({ districtId: 1, countyId: 10 }), makeTable({ districtId: 2, countyId: 20 })]

      irnRepository.addIrnTablesTemporary(irnTables)

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
        irnRepository.addIrnTablesTemporary(irnTables)

        const result = await run(irnRepository.getIrnTables({ startDate: new Date("2010-01-05") }), env)

        pipe(
          result,
          map(v => expect(v).toEqual([irnTables[1], irnTables[2]])),
        )
      })

      it("with no start limit", async () => {
        irnRepository.addIrnTablesTemporary(irnTables)

        const result = await run(irnRepository.getIrnTables({ endDate: new Date("2010-01-05") }), env)

        pipe(
          result,
          map(v => expect(v).toEqual([irnTables[0], irnTables[1]])),
        )
      })

      it("with start and end limit", async () => {
        irnRepository.addIrnTablesTemporary(irnTables)

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
