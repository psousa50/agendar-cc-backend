import { keys } from "ramda"

export const removeUndefined = (o: {}) =>
  keys(o).reduce((acc, k) => ({ ...acc, ...(o[k] === undefined ? {} : { [k]: o[k] }) }), {})
