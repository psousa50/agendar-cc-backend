import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { fetchWrapper } from "../../src/irnFetch/fetchWrapper"
import { actionOf } from "../../src/utils/actions"
import { timingFn } from "../../src/utils/timing"

describe("fetchWrapper", () => {
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
    const result = await run(fetchWrapper("some-page", options), environment)

    expect(fetch).toHaveBeenCalledWith("some-url/some-page", options)

    pipe(
      result,
      map(r => expect(r).toBe(response)),
    )
  })

  it("adds a delay before each fetch", async () => {
    const start = timingFn()
    await run(fetchWrapper("some-page"), environment)

    expect(start.endTimer().inMillis).toBeGreaterThan(fetchDelay - 5)
  })
})
