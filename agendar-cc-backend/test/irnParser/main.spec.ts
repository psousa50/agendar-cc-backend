import * as fs from "fs"
import * as path from "path"
import { IrnTable } from "../../src/irnFetch/models"
import { parseCounties, parseTables } from "../../src/irnParser/main"

it("parses counties from irn html page", () => {
  const html = fs.readFileSync(path.join(__dirname, "./counties.html")).toString()

  const districtId = 10
  const expectedCounties = [
    { countyId: 32, name: "ANGRA DO HEROÍSMO", districtId },
    { countyId: 38, name: "HORTA", districtId },
    { countyId: 33, name: "PONTA DELGADA", districtId },
    { countyId: 39, name: "PRAIA DA VITÓRIA", districtId },
  ]

  const counties = parseCounties(districtId)(html)

  expect(counties).toEqual(expectedCounties)
})

it("parses tables from irn html page", () => {
  const html = fs.readFileSync(path.join(__dirname, "./step2_page1.html")).toString()

  const serviceId = 1
  const county = { districtId: 1, countyId: 1, name: "Some Name" }

  const expectedTable1: IrnTable = {
    address: "Palácio da Justiça - Rua Jayme Thompson",
    county,
    date: new Date("2019-12-17"),
    locationName: "Conservatória do Registo Comercial de Cascais",
    phone: "214818630",
    postalCode: "2750-378",
    serviceId,
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
    serviceId,
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

  const tables = parseTables(serviceId, county, html)

  expect(tables).toEqual(expectedTables)
})
