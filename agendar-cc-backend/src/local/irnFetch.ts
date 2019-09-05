import { getTableParams, IrnTable, IrnTables } from "../irnFetch/models"
import { Counties, Districts, IrnServices } from "../irnRepository/models"
import { Action, actionOf } from "../utils/actions"

const makeTable = (
  serviceId: number,
  districtId: number,
  countyId: number,
  tableNumber: string = "1",
  date: string = "2000-01-01",
): IrnTable => ({
  address: "some address",
  county: { districtId, countyId, countyName: `Count Name ${countyId}`},
  date: new Date(date),
  locationName: "Some location name",
  phone: "123456789",
  postalCode: "1234-567",
  serviceId,
  tableNumber,
  times: ["12:30"],
})

const getIrnTables: Action<getTableParams, IrnTables> = () => {
  return actionOf([
    makeTable(1, 1, 1, "1", "2010-01-01"),
    makeTable(1, 1, 1, "2", "2010-01-10"),
    makeTable(1, 1, 2, "1 A", "2010-01-02"),
    makeTable(1, 2, 1, "3 C", "2010-01-15"),
    makeTable(2, 1, 1, "1 B", "2010-01-20"),
  ])
}

const getCounties: Action<void, Counties> = () =>
  actionOf([
    { districtId: 1, countyId: 10, countyName: "C 10" },
    { districtId: 1, countyId: 11, countyName: "C 11" },
    { districtId: 2, countyId: 20, countyName: "C 20" },
    { districtId: 2, countyId: 21, countyName: "C 21" },
  ])

const getDistricts: Action<void, Districts> = () =>
  actionOf([{ districtId: 1, districtName: "District 1" }, { districtId: 2, districtName: "District 2" }])

const getIrnServices: Action<void, IrnServices> = () => actionOf([{ serviceId: 1, serviceName: "Service 1" }])

export const irnFetchLocal = {
  getCounties,
  getDistricts,
  getIrnServices,
  getIrnTables,
}
