import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither"
import { FilterQuery, MongoClient } from "mongodb"
import { isNil } from "ramda"
import { Counties, Districts, GetTableParams, IrnRepositoryTables, IrnServices } from "../irnRepository/models"
import { ServiceError } from "../utils/audit"

const DB_CONFIG = "_dbConfig"
const IRN_SERVICES = "IrnServices"
const DISTRICTS = "Districts"
const COUNTIES = "Counties"
const IRN_TABLES = "IrnTables"

export interface DbConfig {
  staticDataAdded?: boolean
}

export const connect = (mongoDbUri: string): TaskEither<ServiceError, MongoClient> =>
  tryCatch(
    () => MongoClient.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true }),
    error => new ServiceError((error as Error).message),
  )

export const clearAll = (client: MongoClient) => client.db().dropDatabase()
export const clearAllTables = (client: MongoClient) => client.db().dropCollection(IRN_TABLES)

const get = (collection: string) => (query: FilterQuery<any> = {}) => (client: MongoClient) =>
  client
    .db()
    .collection(collection)
    .find(query)
    .toArray()

export const getIrnServices = get(IRN_SERVICES)()

export const getDistricts = get(DISTRICTS)()

export const getCounties = (districtId?: number) => get(COUNTIES)({ districtId })

const buildGetIrnTablesQuery = ({ serviceId, districtId, countyId, startDate, endDate }: GetTableParams) => ({
  ...(isNil(serviceId) ? {} : { serviceId }),
  ...(isNil(districtId) ? {} : { "district.districtId": districtId }),
  ...(isNil(countyId) ? {} : { "county.countyId": countyId }),
  ...(isNil(startDate) && isNil(endDate)
    ? {}
    : { date: { ...(isNil(startDate) ? {} : { $gte: startDate }), ...(isNil(endDate) ? {} : { $lte: endDate }) } }),
})
export const getIrnTables = (params: GetTableParams) => get(IRN_TABLES)(buildGetIrnTablesQuery(params))

const insertMany = <T>(collection: string) => (data: T[]) => (client: MongoClient) =>
  data.length > 0
    ? client
        .db()
        .collection(collection)
        .insertMany(data)
    : Promise.resolve(undefined)

export const addRIrnServices = (services: IrnServices) => insertMany(IRN_SERVICES)(services)

export const addDistricts = (districts: Districts) => insertMany(DISTRICTS)(districts)

export const addCounties = (counties: Counties) => insertMany(COUNTIES)(counties)

export const addIrnTables = (irnTables: IrnRepositoryTables) => insertMany(IRN_TABLES)(irnTables)

export const getConfig = (client: MongoClient) =>
  client
    .db()
    .collection(DB_CONFIG)
    .findOne({ _id: 1 })

export const updateConfig = (dbConfig: DbConfig) => (client: MongoClient) =>
  client
    .db()
    .collection(DB_CONFIG)
    .updateOne({ _id: 1 }, { $set: { _id: 1, ...dbConfig } }, { upsert: true })
