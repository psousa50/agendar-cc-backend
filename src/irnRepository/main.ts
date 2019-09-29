import * as mongoDb from "../mongodb/main"
import { DbConfig, disconnect } from "../mongodb/main"
import { Action, fromPromise, fromVoidPromise } from "../utils/actions"
import {
  Counties,
  County,
  Districts,
  GetIrnPlacesParams,
  GetIrnRepositoryTablesParams,
  IrnPlace,
  IrnPlaces,
  IrnRepository,
  IrnRepositoryTables,
  IrnServices,
} from "./models"

const clearAll: Action<void, void> = () => fromVoidPromise(env => mongoDb.clearAll(env.dbClient))

const clearIrnTablesTemporary: Action<void, void> = () =>
  fromVoidPromise(env => mongoDb.clearAllIrnTablesTemporary(env.dbClient))

const getCounty: Action<{ countyId: number }, County | null> = ({ countyId }) =>
  fromPromise(env => mongoDb.getCounty(countyId)(env.dbClient))

const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  fromPromise(env => mongoDb.getCounties(districtId)(env.dbClient))

const getDistricts: Action<void, Districts> = () => fromPromise(env => mongoDb.getDistricts(env.dbClient))

const getIrnServices: Action<void, IrnServices> = () => fromPromise(env => mongoDb.getIrnServices(env.dbClient))

const getIrnTables: Action<GetIrnRepositoryTablesParams, IrnRepositoryTables> = params =>
  fromPromise(env => mongoDb.getIrnTables(params)(env.dbClient))

const addCounties: Action<Counties, void> = counties =>
  fromVoidPromise(env => mongoDb.addCounties(counties.map(c => ({ _id: c.countyId, ...c })))(env.dbClient))

const addDistricts: Action<Districts, void> = districts =>
  fromVoidPromise(env => mongoDb.addDistricts(districts.map(d => ({ _id: d.districtId, ...d })))(env.dbClient))

const addIrnTablesTemporary: Action<IrnRepositoryTables, void> = irnTables =>
  fromVoidPromise(env => mongoDb.addIrnTables(irnTables)(env.dbClient))

const addIrnServices: Action<IrnServices, void> = irnServices =>
  fromVoidPromise(env => mongoDb.addIrnServices(irnServices)(env.dbClient))

const getConfig: Action<void, DbConfig | null> = () => fromPromise(env => mongoDb.getConfig(env.dbClient))

const updateConfig: Action<DbConfig, void> = dbConfig =>
  fromVoidPromise(env => mongoDb.updateConfig({ ...dbConfig })(env.dbClient))

const switchIrnTables: Action<void, void> = () => fromVoidPromise(env => mongoDb.switchIrnTables(env.dbClient))

const close: Action<void, void> = () => fromVoidPromise(env => disconnect(env.dbClient))

const getIrnPlace: Action<{ placeName: string }, IrnPlace | null> = ({ placeName }) =>
  fromPromise(env => mongoDb.getIrnPlace(placeName)(env.dbClient))

const getIrnPlaces: Action<GetIrnPlacesParams, IrnPlaces> = params =>
  fromPromise(env => mongoDb.getIrnPlaces(params)(env.dbClient))

const updateIrnPlace: Action<IrnPlace, void> = (irnPlace: IrnPlace) =>
  fromVoidPromise(env => mongoDb.updateIrnPlace(irnPlace)(env.dbClient))

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
  getIrnPlaces,
  getIrnServices,
  getIrnTables,
  switchIrnTables,
  updateConfig,
  updateIrnPlace,
}
