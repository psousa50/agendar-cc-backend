import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderTaskEither"
import qs from "query-string"
import { Action, actionErrorOf, actionOf, ask } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { delayedFetch, extractJson } from "../utils/fetch"
import { GpsLocation } from "../utils/models"

const buildUrl = (url: string, address: string, key: string) => `${url}?${qs.stringify({ address, key })}`

export const get: Action<string, GpsLocation> = address =>
  pipe(
    ask(),
    chain(env =>
      delayedFetch(500)(
        buildUrl(env.config.geoCoding.url, address, process.env.GEO_CODING_KEY || env.config.geoCoding.key),
      ),
    ),
    chain(extractJson),
    chain(geo =>
      geo && geo.results[0] && geo.results[0].geometry && geo.results[0].geometry.location
        ? actionOf({
            latitude: geo.results[0].geometry.location.lat,
            longitude: geo.results[0].geometry.location.lng,
          })
        : actionErrorOf(new ServiceError("Invalid Geo location")),
    ),
  )
