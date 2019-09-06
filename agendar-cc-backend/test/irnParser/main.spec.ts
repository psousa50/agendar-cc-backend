import * as fs from "fs"
import * as path from "path"
import { IrnTable } from "../../src/irnFetch/models"
import { parseCounties, parseTables } from "../../src/irnParser/main"

it.skip("parses counties from irn html page", () => {

  const html = fs.readFileSync(path.join(__dirname, "./step1_page1.html")).toString()

  const expectedDistricts = [
    { districtId: "1", districtName: "Açores" },
    { districtId: "2", districtName: "Aveiro" },
    { districtId: "3", districtName: "Beja" },
    { districtId: "4", districtName: "Braga" },
    { districtId: "5", districtName: "Bragança" },
    { districtId: "6", districtName: "Castelo Branco" },
    { districtId: "7", districtName: "Coimbra" },
    { districtId: "8", districtName: "&Eacute;vora" },
    { districtId: "9", districtName: "Faro" },
    { districtId: "10", districtName: "Guarda" },
    { districtId: "11", districtName: "Leiria" },
    { districtId: "12", districtName: "Lisboa" },
    { districtId: "13", districtName: "Madeira" },
    { districtId: "14", districtName: "Portalegre" },
    { districtId: "15", districtName: "Porto" },
    { districtId: "16", districtName: "Santar&eacute;m" },
    { districtId: "17", districtName: "Setúbal" },
    { districtId: "18", districtName: "Viana do Castelo" },
    { districtId: "19", districtName: "Vila Real" },
    { districtId: "20", districtName: "Viseu" },
  ]

  const tables = parseCounties(html)

  expect(tables).toEqual(expectedDistricts)
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
