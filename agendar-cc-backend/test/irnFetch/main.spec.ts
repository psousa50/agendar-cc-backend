import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { buildGetCounties, delayedFetch } from "../../src/irnFetch/main"
import { actionOf } from "../../src/utils/actions"
import { timingFn } from "../../src/utils/timing"

describe("IrnFetch", () => {
  describe("getCounties", () => {
    it("fetch the counties data for some district id", async () => {
      const counties = [{ some: "counties" }]
      const parseCounties = jest.fn(() => counties)
      const parseCountiesBuilder = jest.fn(() => parseCounties) as any

      const text = "some-text"
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

      const result = await run( buildGetCounties(parseCountiesBuilder)({districtId: 10}), environment)

      expect(fetch).toHaveBeenCalledWith("some-url/some-page?id_distrito=10", undefined)
      expect(parseCountiesBuilder).toHaveBeenCalledWith(10)
      expect(parseCounties).toHaveBeenCalledWith(text)

      pipe(
        result,
        map(r => expect(r).toBe(counties)),
      )
    })
  })
})

describe("delayedFetch", () => {
  const response = { some: "response" }
  const fetch = jest.fn(() => actionOf(response))
  const fetchDelay = 20
  const environment = {
    config: {
      fetchDelay,
      irnUrlLocations: {
        irnUrl: "some-url",
      },
    },
    fetch,
  } as any

  it("call fetch on Irn site", async () => {
    const options = { some: "options" } as any
    const result = await run(delayedFetch("some-page", options), environment)

    expect(fetch).toHaveBeenCalledWith("some-url/some-page", options)

    pipe(
      result,
      map(r => expect(r).toBe(response)),
    )
  })

  it("adds a delay before each fetch", async () => {
    const start = timingFn()
    await run(delayedFetch("some-page"), environment)

    expect(start.endTimer().inMillis).toBeGreaterThan(fetchDelay - 5)
  })
})
