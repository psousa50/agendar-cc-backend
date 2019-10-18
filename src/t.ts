import moment from "moment"

type DateOnlyBrand = { DateOnly: "" }

export type DateOnly = string & DateOnlyBrand

function validDateOnly(d: string): d is DateOnly {
  return moment(d, "YYYY-MM-DD", true).isValid()
}

export const toDateOnly = (d: Date | string): DateOnly | undefined =>
  typeof d === "string" ? (validDateOnly(d) ? d : undefined) : (d.toISOString().substr(0, 10) as DateOnly)
export const toDate = (d: DateOnly) => new Date(d)

const date: Date = new Date("2019-10-08T12:34:56.000Z")

const d1 = toDateOnly(date)!
const d2 = toDate(d1)

console.log("=====>\n", d1)

console.log("=====>\n", d2)
console.log("=====>\n", d2.getDay())
