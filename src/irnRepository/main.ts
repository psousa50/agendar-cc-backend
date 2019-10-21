import { pipe } from "fp-ts/lib/pipeable"
import { map } from "fp-ts/lib/ReaderTaskEither"
import * as mongoDb from "../mongodb/main"
import { DbConfig, disconnect } from "../mongodb/main"
import { globalDistricts } from "../staticData/districts"
import { Action, actionOf, fromPromise, fromVoidPromise } from "../utils/actions"
import { toUtcDate } from "../utils/dates"
import {
  Counties,
  County,
  District,
  Districts,
  GetIrnPlacesParams,
  GetIrnRepositoryTablesParams,
  IrnPlace,
  IrnPlaces,
  IrnRepository,
  IrnRepositoryTables,
  IrnService,
  IrnServices,
  Region,
} from "./models"

const clearAll: Action<void, void> = () => fromVoidPromise(env => mongoDb.clearAll(env.dbClient))

const clearIrnTablesTemporary: Action<void, void> = () =>
  fromVoidPromise(env => mongoDb.clearAllIrnTablesTemporary(env.dbClient))

const getCounty: Action<{ countyId: number }, County | null> = ({ countyId }) =>
  fromPromise(env => mongoDb.getCounty(countyId)(env.dbClient))

const getCounties: Action<{ districtId?: number }, Counties> = ({ districtId }) =>
  fromPromise(env => mongoDb.getCounties(districtId)(env.dbClient))

const getDistrict: Action<{ districtId: number }, District | null> = ({ districtId }) =>
  fromPromise(env => mongoDb.getDistrict(districtId)(env.dbClient))
const getDistricts: Action<void, Districts> = () => fromPromise(env => mongoDb.getDistricts(env.dbClient))

const getIrnService: Action<{ serviceId: number }, IrnService | null> = ({ serviceId }) =>
  fromPromise(env => mongoDb.getIrnService(serviceId)(env.dbClient))
const getIrnServices: Action<void, IrnServices> = () => fromPromise(env => mongoDb.getIrnServices(env.dbClient))

const getIrnTables: Action<GetIrnRepositoryTablesParams, IrnRepositoryTables> = params =>
  pipe(
    fromPromise(env => mongoDb.getIrnTables(params)(env.dbClient)),
    map(irnTables => (params.onlyOnSaturdays ? irnTables.filter(t => toUtcDate(t.date).getDay() === 6) : irnTables)),
  )

const addCounties: Action<Counties, void> = counties =>
  fromVoidPromise(env => mongoDb.addCounties(counties.map(c => ({ _id: c.countyId, ...c })))(env.dbClient))

const addDistricts: Action<Districts, void> = districts =>
  fromVoidPromise(env => mongoDb.addDistricts(districts.map(d => ({ _id: d.districtId, ...d })))(env.dbClient))

const addIrnTablesTemporary: Action<IrnRepositoryTables, void> = irnTables =>
  fromVoidPromise(env => mongoDb.addIrnTablesTemporary(irnTables)(env.dbClient))

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

const upsertIrnPlace: Action<Partial<IrnPlace>, void> = irnPlace =>
  fromVoidPromise(env => mongoDb.updateIrnPlace(irnPlace)(env.dbClient))

const getDistrictRegion: Action<number, Region> = districtId =>
  actionOf(globalDistricts.find(d => d.districtId === districtId)!.region)

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
  getDistrict,
  getDistrictRegion,
  getDistricts,
  getIrnPlace,
  getIrnPlaces,
  getIrnService,
  getIrnServices,
  getIrnTables,
  switchIrnTables,
  updateConfig,
  upsertIrnPlace,
}
