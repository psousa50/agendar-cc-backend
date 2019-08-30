import cheerio from "cheerio"
import { IrnTable, IrnTables } from "../irnFetch/models"
import { County } from "../irnRepository/models"
import "../utils/strings"

const fix = (s: string) => s.replaceAll("\"", "").trim()

export const parseTables = (county: County, html: string): IrnTables => {
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
      county,
      date: new Date(parts[2]),
      locationName: parts[3],
      phone: parts[7],
      postalCode: parts[6],
      tableNumber: parts[4],
      times: times.slice(1),
    }

    return table
  }

  const horarios = $("select[name='horario']")

  return horarios.toArray().map(buildTable)
}
