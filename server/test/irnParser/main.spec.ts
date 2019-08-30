import * as fs from "fs"
import * as path from "path"
import { IrnTable } from "../../src/irnFetch/models"
import { parseTables } from "../../src/irnParser/main"

it("loads a page", () => {

  const html = fs.readFileSync(path.join(__dirname, "./page1.html")).toString()

  const county = { districtId: 1, countyId: 1 }

  const expectedTable1: IrnTable = {
    address: "Palácio da Justiça - Rua Jayme Thompson",
    county,
    date: new Date("2019-12-17"),
    locationName: "Conservatória do Registo Comercial de Cascais",
    phone: "214818630",
    postalCode: "2750-378",
    tableNumber: "1",
    times: ["13:45:00", "14:45:00"],
  }

  const expectedTable2: IrnTable = {
    address: "Palácio da Justiça - Rua Jayme Thompson",
    county,
    date: new Date("2019-12-17"),
    locationName: "2ª Conservatória do Registo Predial de Cascais",
    phone: "214843521",
    postalCode: "2750-379",
    tableNumber: "5",
    times: [
      "09:45:00",
      "10:15:00",
      "10:30:00",
      "10:45:00",
      "11:30:00",
      "13:00:00",
      "13:15:00",
      "13:30:00",
      "13:45:00",
      "14:15:00",
      "14:30:00",
      "14:45:00",
      "15:15:00",
      "15:30:00",
    ],
  }
  const expectedTables = [expectedTable1, expectedTable2]

  const tables = parseTables(county, html)

  expect(tables).toEqual(expectedTables)
})
