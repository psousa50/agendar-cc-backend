import * as mongoDb from "../mongodb/main"
import { DbConfig, disconnect } from "../mongodb/main"
import { Action, fromPromise, fromVoidPromise } from "../utils/actions"
import { Counties, Districts, GetTableParams, IrnRepositoryTables, IrnServices } from "./models"

const clearAll: Action<void, void> = () => fromVoidPromise(env => mongoDb.clearAll(env.dbClient))

const clearAllTables: Action<void, void> = () => fromVoidPromise(env => mongoDb.clearAllTables(env.dbClient))

const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  fromPromise(env => mongoDb.getCounties(districtId)(env.dbClient))

const getDistricts: Action<void, Districts> = () => fromPromise(env => mongoDb.getDistricts(env.dbClient))

const getIrnServices: Action<void, IrnServices> = () => fromPromise(env => mongoDb.getIrnServices(env.dbClient))

const getIrnTables: Action<GetTableParams, IrnRepositoryTables> = params =>
  fromPromise(env => mongoDb.getIrnTables(params)(env.dbClient))

const addCounties: Action<Counties, void> = counties =>
  fromVoidPromise(env => mongoDb.addCounties(counties.map(c => ({ _id: c.countyId, ...c })))(env.dbClient))

const addDistricts: Action<Districts, void> = districts =>
  fromVoidPromise(env => mongoDb.addDistricts(districts.map(d => ({ _id: d.districtId, ...d })))(env.dbClient))

const addIrnTables: Action<IrnRepositoryTables, void> = irnTables =>
  fromVoidPromise(env => mongoDb.addIrnTables(irnTables)(env.dbClient))

const addIrnServices: Action<IrnServices, void> = irnServices =>
  fromVoidPromise(env => mongoDb.addRIrnServices(irnServices)(env.dbClient))

const getConfig: Action<void, DbConfig | null> = () => fromPromise(env => mongoDb.getConfig(env.dbClient))

const updateConfig: Action<DbConfig, void> = dbConfig =>
  fromVoidPromise(env => mongoDb.updateConfig({ ...dbConfig })(env.dbClient))

const switchIrnTables: Action<void, void> = () => fromVoidPromise(env => mongoDb.switchIrnTables(env.dbClient))

const end: Action<void, void> = () => fromVoidPromise(env => disconnect(env.dbClient))

export const irnRepository = {
  addCounties,
  addDistricts,
  addIrnServices,
  addIrnTables,
  clearAll,
  clearAllTables,
  end,
  getConfig,
  getCounties,
  getDistricts,
  getIrnServices,
  getIrnTables,
  switchIrnTables,
  updateConfig,
}
