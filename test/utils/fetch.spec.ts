import { run } from "fp-ts/lib/ReaderTaskEither"
import { ServiceError } from "../../src/utils/audit"
import { buildFetchAction } from "../../src/utils/fetch"

describe("fetchAction", () => {
  const log = jest.fn()
  const retryCount = 3
  const environment = {
    config: {
      retryCount,
      retryDelay: 1,
    },
    log,
  }

  it("retries on failure", async () => {
    const fetch = jest.fn(() => Promise.reject(new ServiceError("error")))

    const fetchAction = buildFetchAction(fetch)
    const input = "some-input"
    const init = { some: "init" } as any

    await run(fetchAction(input, init), environment as any)

    expect(log).toHaveBeenCalledTimes(retryCount)
    expect(fetch).toHaveBeenCalledTimes(retryCount)
    expect(fetch).toHaveBeenCalledWith(input, init)
    expect(fetch).toHaveBeenCalledWith(input, init)
    expect(fetch).toHaveBeenCalledWith(input, init)
  })
})
