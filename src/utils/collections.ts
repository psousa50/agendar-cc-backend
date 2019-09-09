export const minDate = (dates: readonly Date[]) =>
  dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined

export const flatten = <T>(list: T[][]) => list.reduce((acc, cur) => [...acc, ...cur], [] as T[])
