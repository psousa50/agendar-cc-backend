interface String {
  replaceAll(searchValue: string, replaceValue: string): string
}

String.prototype.replaceAll = function(searchValue: string, replaceValue: string): string {
  return replaceAll(this.valueOf(), searchValue, replaceValue)
}

function replaceAll(s: string, searchValue: string, replaceValue: string): string {
  const newString = s.replace(searchValue, replaceValue)
  return newString === s ? newString : replaceAll(newString, searchValue, replaceValue)
}
