import { Counties, Districts, IrnServices } from "../irnRepository/models"
import { Action, actionOf } from "../utils/actions"
import { GetIrnTableParams, IrnTable, IrnTables } from "./models"

const makeTable = (
  serviceId: number,
  districtId: number,
  countyId: number,
  tableNumber: string = "1",
  date: string = "2000-01-01",
): IrnTable => ({
  address: "some address",
  county: { districtId, countyId, name: `Count Name ${countyId}`, gps: [0, 0] },
  date: new Date(date),
  locationName: "Some location name",
  phone: "123456789",
  postalCode: "1234-567",
  serviceId,
  tableNumber,
  times: ["12:30"],
})

const getIrnTables: Action<GetIrnTableParams, IrnTables> = () => {
  return actionOf([
    makeTable(1, 1, 1, "1", "2010-01-01"),
    makeTable(1, 1, 1, "2", "2010-01-10"),
    makeTable(1, 1, 2, "1 A", "2010-01-02"),
    makeTable(1, 2, 1, "3 C", "2010-01-15"),
    makeTable(2, 1, 1, "1 B", "2010-01-20"),
  ])
}

const gps: [number, number] = [0, 0]
const getCounties: Action<{ districtId: number }, Counties> = ({ districtId }) =>
  actionOf(
    [
      { districtId: 1, countyId: 10, name: "C 10", gps },
      { districtId: 1, countyId: 11, name: "C 11", gps },
      { districtId: 2, countyId: 20, name: "C 20", gps },
      { districtId: 2, countyId: 21, name: "C 21", gps },
      { districtId: 3, countyId: 31, name: "C 31", gps },
      { districtId: 4, countyId: 41, name: "C 41", gps },
      { districtId: 5, countyId: 51, name: "C 51", gps },
      { districtId: 6, countyId: 61, name: "C 61", gps },
    ].filter(c => !districtId || c.districtId === districtId),
  )

const getDistricts: Action<void, Districts> = () =>
  actionOf([
    { districtId: 1, name: "District 1", gps: [0, 0] },
    { districtId: 2, name: "District 2", gps: [0, 0] },
    { districtId: 3, name: "District 3", gps: [0, 0] },
  ])

const getIrnServices: Action<void, IrnServices> = () => actionOf([{ serviceId: 1, name: "Service 1" }])

export const irnFetch = {
  getCounties,
  getDistricts,
  getIrnServices,
  getIrnTables,
}
