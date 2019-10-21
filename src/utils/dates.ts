import moment from "moment"

const DateStringFormat = "YYYY-MM-DD"
type DateStringBrand = { DateString: "" }

export type DateString = string & DateStringBrand

const validDateString = (d: string): d is DateString => moment(d, DateStringFormat, true).isValid()

export const toDateString = (d: Date | string | undefined): DateString | undefined =>
  d
    ? typeof d === "string"
      ? validDateString(d)
        ? d
        : undefined
      : (moment.utc(d).format(DateStringFormat) as DateString)
    : undefined

export const toExistingDateString = (d: Date | string): DateString =>
  typeof d === "string" ? (d as DateString) : (moment.utc(d).format(DateStringFormat) as DateString)

export const toUtcMaybeDate = (d: DateString | undefined) => (d ? toUtcDate(d) : undefined)
export const toUtcDate = (d: DateString) => moment.utc(d).toDate()
export const currentUtcDateString = () => toExistingDateString(moment.utc().toDate())
export const currentUtcDateTime = () => moment.utc()

export const addDays = (d: DateString, days: number) =>
  toExistingDateString(
    moment
      .utc(d)
      .add(days, "days")
      .toDate(),
  )
