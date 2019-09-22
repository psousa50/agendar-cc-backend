import { Counties, IrnRepositoryTable } from "../irnRepository/models"
import { Action } from "../utils/actions"

export type GetIrnTableParams = {
  serviceId: number
  districtId: number
  countyId: number
  date?: Date
}

export type IrnTable = IrnRepositoryTable
export type IrnTables = IrnTable[]

export interface IrnFetch {
  getIrnTables: Action<GetIrnTableParams, IrnTables>
  getCounties: Action<{ districtId: number }, Counties>
}
