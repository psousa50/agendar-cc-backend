export const minDate = (dates: readonly Date[]) =>
  dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined

export const flatten = <T>(list: T[][]) => list.reduce((acc, cur) => [...acc, ...cur], [] as T[])

export const max = <T>(col: T[]) =>
  col.length > 0 ? col.reduce((acc, d) => (acc ? (d > acc ? d : acc) : d), col[0]) : undefined
export const min = <T>(col: T[]) =>
  col.length > 0 ? col.reduce((acc, d) => (acc ? (d < acc ? d : acc) : d), col[0]) : undefined
