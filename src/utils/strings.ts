export const properCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .split(" ")
    .map(w => `${w[0].toUpperCase()}${w.substring(1)}`)
    .join(" ")
