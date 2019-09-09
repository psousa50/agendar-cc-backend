import { isNil } from "ramda"
import { IrnTables } from "../irnFetch/models"
import { Action, actionOf } from "../utils/actions"
import { Counties, Districts, GetTableParams, IrnRepositoryTable, IrnRepositoryTables, IrnServices } from "./models"

interface Repository {
  counties: Counties
  districts: Districts
  irnServices: IrnServices
  irnTables: IrnTables
}

const Repository: Repository = {
  counties: [],
  districts: [],
  irnServices: [],
  irnTables: [],
}

const addCounties: Action<Counties, void> = counties => {
  Repository.counties = [...Repository.counties, ...counties]
  return actionOf(undefined)
}

const addDistricts: Action<Districts, void> = districts => {
  Repository.districts = [...Repository.districts, ...districts]
  return actionOf(undefined)
}

const addIrnTables: Action<IrnRepositoryTables, void> = irnTables => {
  Repository.irnTables = [...Repository.irnTables, ...irnTables]
  return actionOf(undefined)
}

const addIrnServices: Action<IrnServices, void> = irnServices => {
  Repository.irnServices = [...Repository.irnServices, ...irnServices]
  return actionOf(undefined)
}

const clearAll: Action<void, void> = () => {
  Repository.counties = []
  Repository.districts = []
  Repository.irnServices = []
  Repository.irnTables = []
  return actionOf(undefined)
}

const clearAllTables: Action<void, void> = () => {
  Repository.irnTables = []
  return actionOf(undefined)
}

const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  actionOf(Repository.counties.filter(c => isNil(districtId) || c.districtId === districtId))

const getDistricts: Action<void, Districts> = () => actionOf(Repository.districts)

const getIrnServices: Action<void, IrnServices> = () => actionOf(Repository.irnServices)

const by = ({ serviceId, districtId, countyId, startDate, endDate }: GetTableParams) => (
  irnTable: IrnRepositoryTable,
) =>
  (isNil(serviceId) || irnTable.serviceId === serviceId) &&
  (isNil(districtId) || irnTable.county.districtId === districtId) &&
  (isNil(countyId) || irnTable.county.countyId === countyId) &&
  (isNil(startDate) || irnTable.date >= startDate) &&
  (isNil(endDate) || irnTable.date <= endDate)

const getIrnTables: Action<GetTableParams, IrnRepositoryTables> = params =>
  actionOf(Repository.irnTables.filter(by(params)))

export const irnRepository = {
  addCounties,
  addDistricts,
  addIrnServices,
  addIrnTables,
  clearAll,
  clearAllTables,
  getCounties,
  getDistricts,
  getIrnServices,
  getIrnTables,
}
