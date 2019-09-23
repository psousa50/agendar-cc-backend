import { isNil } from "ramda"
import { DbConfig } from "../mongodb/main"
import { Action, actionOf } from "../utils/actions"
import {
  Counties,
  County,
  Districts,
  GetTableParams,
  IrnPlace,
  IrnRepository,
  IrnRepositoryTable,
  IrnRepositoryTables,
  IrnServices,
  Repository,
} from "./models"

const Repository: Repository = {
  counties: [],
  dbConfig: {},
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

const addIrnTablesTemporary: Action<IrnRepositoryTables, void> = irnTables => {
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

const clearIrnTablesTemporary: Action<void, void> = () => {
  Repository.irnTables = []
  return actionOf(undefined)
}

const getCounty: Action<{ countyId: number }, County> = () => actionOf(undefined as any)

const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  actionOf(Repository.counties.filter(c => isNil(districtId) || c.districtId === districtId))

const getDistricts: Action<void, Districts> = () => actionOf(Repository.districts)

const getIrnServices: Action<void, IrnServices> = () => actionOf(Repository.irnServices)

const by = ({ serviceId, districtId, countyId, startDate, endDate }: GetTableParams) => (
  irnTable: IrnRepositoryTable,
) =>
  (isNil(serviceId) || irnTable.serviceId === serviceId) &&
  (isNil(districtId) || irnTable.districtId === districtId) &&
  (isNil(countyId) || irnTable.countyId === countyId) &&
  (isNil(startDate) || irnTable.date >= startDate) &&
  (isNil(endDate) || irnTable.date <= endDate)

const getIrnTables: Action<GetTableParams, IrnRepositoryTables> = params =>
  actionOf(Repository.irnTables.filter(by(params)))

const getConfig: Action<void, DbConfig> = () => actionOf(Repository.dbConfig)
const updateConfig: Action<DbConfig, void> = dbConfig => {
  Repository.dbConfig = { ...Repository.dbConfig, ...dbConfig }
  return actionOf(undefined)
}

const close: Action<void, void> = () => actionOf(undefined)
const switchIrnTables: Action<void, void> = () => actionOf(undefined)

const getIrnPlace: Action<{ placeName: string }, IrnPlace> = () => actionOf(undefined as any)

const updateIrnPlace: Action<IrnPlace, void> = (_: IrnPlace) => actionOf(undefined)

export const irnRepository: IrnRepository = {
  addCounties,
  addDistricts,
  addIrnServices,
  addIrnTablesTemporary,
  clearAll,
  clearIrnTablesTemporary,
  close,
  getConfig,
  getCounties,
  getCounty,
  getDistricts,
  getIrnPlace,
  getIrnServices,
  getIrnTables,
  switchIrnTables,
  updateConfig,
  updateIrnPlace,
}
