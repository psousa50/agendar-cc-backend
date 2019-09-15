import * as fs from "fs"
import * as path from "path"
import { IrnTable } from "../../src/irnFetch/models"
import { parseCounties, parseIrnTables, parseTok } from "../../src/irnParser/main"

it("parses counties from get_concelhos html", () => {
  const html = fs.readFileSync(path.join(__dirname, "./htmlSamples/counties.html")).toString()

  const districtId = 10
  const expectedCounties = [
    { countyId: 32, name: "ANGRA DO HEROÍSMO", districtId, gps: [0, 0] },
    { countyId: 38, name: "HORTA", districtId, gps: [0, 0] },
    { countyId: 33, name: "PONTA DELGADA", districtId, gps: [0, 0] },
    { countyId: 39, name: "PRAIA DA VITÓRIA", districtId, gps: [0, 0] },
  ]

  const counties = parseCounties(districtId)(html)

  expect(counties).toEqual(expectedCounties)
})

it("parses tok from the home page", () => {
  const html = fs.readFileSync(path.join(__dirname, "./htmlSamples/step1_page1.html")).toString()

  const tok = parseTok(html)

  expect(tok).toEqual(
    "926c14aef268a7f94ccebae6bfc294f52d9e22b2bc9601dfbddf1b682be60707f8068fc7163e87e5189e549301f1e140e7e77beecca256e0d497ccf369235873",
  )
})

it("parses tables from irn tables html page", () => {
  const html = fs.readFileSync(path.join(__dirname, "./htmlSamples/step2_page1.html")).toString()

  const serviceId = 1
  const service = {
    serviceId,
  } as any
  const county = { districtId: 1, countyId: 1, name: "Some Name", gps: [0, 0] as [number, number] }

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

  const tables = parseIrnTables(service, county)(html)

  expect(tables).toEqual(expectedTables)
})
