import { isNil } from "ramda"
import { IrnTables } from "../irnFetch/models"
import { Action, actionOf } from "../utils/actions"
import { Counties, Districts, GetTableParams, IrnRepositoryTables, IrnServices } from "./models"

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

const getCounties: Action<{ districtId?: number }, Counties> = districtId =>
  actionOf(Repository.counties.filter(c => isNil(districtId) || c.districtId === districtId))

const getDistricts: Action<void, Districts> = () => actionOf(Repository.districts)

const getIrnServices: Action<void, IrnServices> = () => actionOf(Repository.irnServices)

const getIrnTables: Action<GetTableParams, IrnRepositoryTables> = () => actionOf(Repository.irnTables)

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
