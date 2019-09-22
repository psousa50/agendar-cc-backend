import cheerio from "cheerio"
import { IrnTable, IrnTables } from "../irnFetch/models"
import { Counties } from "../irnRepository/models"
import "../utils/strings"

const fix = (s: string) => s.replaceAll('"', "").trim()

export type ParseTok = (html: string) => string
export const parseTok: ParseTok = html => {
  const $ = cheerio.load(html)

  const tokInput = $("input[name='tok']")

  return $(tokInput).attr("value")
}

export type ParseIrnTables = (serviceId: number, countyId: number, districtId: number) => (html: string) => IrnTables
export const parseIrnTables: ParseIrnTables = (serviceId, countyId, districtId) => html => {
  const $ = cheerio.load(html)

  const buildTable = (horario: CheerioElement) => {
    const tableInfo = $(horario)
      .attr("onchange")
      .replaceAll("'", '"')
      .replace(");", "")

    const p = tableInfo.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
    const parts = p.map(fix)

    const timeOptions = $(horario).find("option")

    const times = $(timeOptions)
      .toArray()
      .map(h => $(h).attr("value"))

    const table: IrnTable = {
      address: parts[5],
      countyId,
      date: new Date(parts[2]),
      districtId,
      phone: parts[7],
      placeName: parts[3],
      postalCode: parts[6],
      serviceId,
      tableNumber: parts[4],
      timeSlots: times.slice(1),
    }

    return table
  }

  const horarios = $("select[name='horario']")

  return horarios.toArray().map(buildTable)
}

export type ParseCounties = (districtId: number) => (html: string) => Counties
export const parseCounties: ParseCounties = districtId => html => {
  const $ = cheerio.load(html)

  const options = $("option")

  return options
    .toArray()
    .filter(o => $(o).attr("value").length > 0)
    .map(o => ({ countyId: Number.parseInt($(o).attr("value"), 10), name: $(o).text(), districtId, gps: [0, 0] }))
}
