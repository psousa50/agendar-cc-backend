import { Action } from "../../../shared/actions"
import { Counties, IrnTable, IrnTables } from "../irnRepository/models"

export type FindParams = {
  districtId: number
  countyId: number
  date?: number
}

export interface IrnFetch {
  find: Action<FindParams, IrnTables>
  getCounties: Action<void, Counties>
}
