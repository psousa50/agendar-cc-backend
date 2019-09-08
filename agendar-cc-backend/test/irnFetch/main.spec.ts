import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { buildGetCounties, buildGetIrnTables, delayedFetch } from "../../src/irnFetch/main"
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
            countiesPage: "some-counties-page",
            irnUrl: "some-url",
          },
        },
        fetch,
      } as any

      const result = await run(buildGetCounties(parseCountiesBuilder)({ districtId: 10 }), environment)

      expect(fetch).toHaveBeenCalledWith("some-url/some-counties-page?id_distrito=10", undefined)
      expect(parseCountiesBuilder).toHaveBeenCalledWith(10)
      expect(parseCounties).toHaveBeenCalledWith(text)

      pipe(
        result,
        map(r => expect(r).toBe(counties)),
      )
    })
  })
  describe("getIrnTables", () => {
    it("fetches the irn tables for a specifice service, county and date", async () => {
      const service = {
        name: "Some Service name",
        serviceId: 5,
      }
      const county = {
        countyId: 10,
        districtId: 20,
        name: "Some County name",
      }
      const dateStr = "2010-02-28"
      const date = new Date(dateStr)

      const homeHtml = "htyml from home page"
      const tok = "some-tok-value"
      const homeResponse = {
        headers: {
          forEach: jest
            .fn()
            .mockImplementationOnce((cb: any) => {
              cb("cookie1", "set-cookie")
              cb("some-header-typeÌ", "some-header")
              cb("cookie2", "set-cookie")
            }),
        },
        text: () => Promise.resolve(homeHtml),
      }

      const parseTok = jest.fn(() => tok)

      const irnTables = [{ some: "irnTables" }]
      const parseIrnTables = jest.fn(() => irnTables)
      const parseIrnTablesBuilder = jest.fn(() => parseIrnTables) as any

      const tablesHtml = "html from tables page"
      const tablesResponse = {
        text: () => Promise.resolve(tablesHtml),
      }
      const formData = { data: "some-form-data", boundary: "some-boundary" }
      const buildFormData = jest.fn(() => formData)
      const fetch = jest
        .fn()
        .mockImplementationOnce(() => actionOf(homeResponse))
        .mockImplementationOnce(() => actionOf(tablesResponse))

      const environment = {
        config: {
          irnUrlLocations: {
            homePage: "some-home-page",
            irnTablesPage: "some-tables-page",
            irnUrl: "some-url",
          },
        },
        fetch,
      } as any

      const params = { service, county, date }
      const result = await run(buildGetIrnTables(parseTok, parseIrnTablesBuilder, buildFormData)(params), environment)

      const options = {
        body: formData.data,
        headers: {
          "Cookie": "cookie1,cookie2",
          "content-type": `multipart/form-data; boundary=${formData.boundary}`,
        },
        method: "POST",
      }

      expect(fetch).toHaveBeenCalledWith("some-url/some-home-page", undefined)
      expect(parseTok).toHaveBeenCalledWith(homeHtml)

      expect(buildFormData).toHaveBeenCalledWith(tok, params)

      expect(fetch).toHaveBeenCalledWith("some-url/some-tables-page", options)
      expect(parseIrnTablesBuilder).toHaveBeenCalledWith(service, county)
      expect(parseIrnTables).toHaveBeenCalledWith(tablesHtml)

      pipe(
        result,
        map(r => expect(r).toBe(irnTables)),
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
