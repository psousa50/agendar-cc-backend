import { sort, uniq } from "ramda"
import { globalCounties } from "./staticData/counties"
import { globalDistricts } from "./staticData/districts"
import { globalIrnPlaces } from "./staticData/irnPlaces"
import { logDebug } from "./utils/debug"

const allDistricts = globalCounties.map(c => {
  const d = globalDistricts.find(dd => dd.districtId === c.districtId)!
  return `${d.name} - ${c.name}`
})

sort((d1, d2) => d1.localeCompare(d2), allDistricts).map(c => logDebug(c))

const uniqD = sort((d1, d2) => d1 - d2, uniq(globalIrnPlaces.map(p => p.districtId)))

console.log("=====>\n", uniqD)

const dWithPlaces = globalDistricts.map(d => ({
  ...d,
  countPlaces: globalIrnPlaces.filter(p => p.districtId === d.districtId).length,
}))

console.log("=====>\n", dWithPlaces)
