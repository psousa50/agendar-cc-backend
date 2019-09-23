import { sort } from "ramda"
import { globalCounties } from "./staticData/counties"
import { globalDistricts } from "./staticData/districts"
import { logDebug } from "./utils/debug"

const allDistricts = globalCounties.map(c => {
  const d = globalDistricts.find(dd => dd.districtId === c.districtId)!
  return `${d.name} - ${c.name}`
})

sort((d1, d2) => d1.localeCompare(d2), allDistricts).map(c => logDebug(c))
