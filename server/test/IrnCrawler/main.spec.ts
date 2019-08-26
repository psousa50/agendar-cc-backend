import { run } from "fp-ts/lib/ReaderTaskEither"
import { actionOf } from "../../../shared/actions"
import { irnCrawler } from "../../src/irnCrawler/main";

describe("IrnCrawler", () => {
  describe("start", () => {
    it("persists new IrnTables", async () => {
      const districtId1 = 42
      const countyId1 = 53
      const districtId2 = 65
      const countyId2 = 78
      const counties = [
        {
          countyId: countyId1,
          districtId: districtId1,
        },
        {
          countyId: countyId2,
          districtId: districtId2,
        },
      ]
      const irnTables1 = [
        {
          some: "tables1",
        },
      ]
      const irnTables2 = [
        {
          some: "tables2",
        },
      ]
      const irnFetch = {
        find: jest
          .fn()
          .mockImplementationOnce(() => actionOf(irnTables1))
          .mockImplementationOnce(() => actionOf(irnTables2)),
        getCounties: () => actionOf(counties),
      } as any

      const irnRepository = {
        addTables: jest.fn(() => actionOf(undefined)),
        getAll: () => actionOf([]),
      } as any

      const environment =  {
        irnFetch,
        irnRepository,
      } as any

      await run(irnCrawler.start(), environment)

      expect(irnFetch.find).toHaveBeenCalledWith({ districtId: districtId1, countyId: countyId1 })
      expect(irnFetch.find).toHaveBeenCalledWith({ districtId: districtId2, countyId: countyId2 })
      expect(irnRepository.addTables).toHaveBeenCalledWith([...irnTables1, ...irnTables2])
    })
  })
})
