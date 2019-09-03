import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { buildGetCounties } from "../../src/irnFetch/main"
import { actionOf } from "../../src/utils/actions"

describe("IrnFetch", () => {
  describe("getCounties", () => {
    it("", async () => {
      const counties = [{ some: "counties" }]
      const parseCounties = jest.fn(() => counties) as any

      const text = "some - text"
      const response = {
        text: () => Promise.resolve(text),
      }
      const fetch = jest.fn(() => actionOf(response))
      const environment = {
        config: {
          irnUrlLocations: {
            countiesPage: "some-page",
            irnUrl: "some-url",
          },
        },
        fetch,
      } as any

      const result = await run( buildGetCounties(parseCounties)(), environment)

      expect(fetch).toHaveBeenCalledWith("some-url/some-page")
      expect(parseCounties).toHaveBeenCalledWith(text)

      pipe(
        result,
        map(r => expect(r).toBe(counties)),
      )
    })
  })
})
