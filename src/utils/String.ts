interface String {
  replaceAll(searchValue: string, replaceValue: string): string
}

String.prototype.replaceAll = function(searchValue: string, replaceValue: string): string {
  const newString = this.replace(searchValue, replaceValue)
  return newString === this ? newString : newString.replaceAll(searchValue, replaceValue)
}
