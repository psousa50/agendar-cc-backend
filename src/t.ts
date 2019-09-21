import { sort } from "ramda"
import { globalCounties } from "./staticData/counties"
import { globalDistricts } from "./staticData/districts"

const allDistricts = globalCounties.map(c => {
  const d = globalDistricts.find(dd => dd.districtId === c.districtId)!
  return `${d.name} - ${c.name}`
})

sort((d1, d2) => d1.localeCompare(d2), allDistricts).map(c => console.log(c))
