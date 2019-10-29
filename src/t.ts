import { logDebug } from "./utils/debug"
import { removeUndefined } from "./utils/object"

const x = {
  a: 1,
  b: 2,
}

const y = {
  a: 4,
  b: undefined,
  f: 3,
}

const z = { ...x, ...removeUndefined(y) }

logDebug("=====>\n", z)
