import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither"
import { FilterQuery, InsertWriteOpResult, MongoClient } from "mongodb"
import { isNil } from "ramda"
import {
  Counties,
  County,
  District,
  Districts,
  GetIrnPlacesParams,
  GetIrnRepositoryTablesParams,
  IrnPlace,
  IrnRepositoryTable,
  IrnRepositoryTables,
  IrnService,
  IrnServices,
} from "../irnRepository/models"
import { ServiceError } from "../utils/audit"

const DB_CONFIG = "_dbConfig"
const IRN_SERVICES = "IrnServices"
const DISTRICTS = "Districts"
const COUNTIES = "Counties"
const IRN_TABLES_TEMPORARY = "_IrnTablesTemporary"
const IRN_TABLES = "IrnTables"
const IRN_PLACES = "IrnPlaces"

export interface DbConfig {
  staticDataAdded?: boolean
  refreshStarted?: Date
  refreshEnded?: Date
}

export const connect = (mongoDbUri: string): TaskEither<ServiceError, MongoClient> =>
  tryCatch(
    () => MongoClient.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true }),
    error => new ServiceError((error as Error).message),
  )

export const disconnect = (client: MongoClient) => client.close()

export const clearAll = (client: MongoClient) => client.db().dropDatabase()
export const clearAllIrnTablesTemporary = (client: MongoClient) => client.db().dropCollection(IRN_TABLES_TEMPORARY)

function getById<T>(collection: string) {
  return (id: any) => (client: MongoClient) =>
    client
      .db()
      .collection<T>(collection)
      .findOne({ _id: id })
}
function get<T>(collection: string) {
  return (query: FilterQuery<any> = {}) => (client: MongoClient) => {
    console.log("QUERY=====>\n", query)
    return client
      .db()
      .collection<T>(collection)
      .find(query)
      .toArray()
  }
}
export const getIrnServices = get<IrnService>(IRN_SERVICES)()

export const getDistricts = get<District>(DISTRICTS)()

export const getCounty = (countyId?: number) => getById<County>(COUNTIES)(countyId)

export const getCounties = (districtId?: number) => get<County>(COUNTIES)({ ...(districtId ? { districtId } : {}) })

const buildGetIrnTablesQuery = ({
  serviceId,
  districtId,
  countyId,
  placeName,
  startDate,
  endDate,
}: GetIrnRepositoryTablesParams) => ({
  ...(isNil(serviceId) ? {} : { serviceId }),
  ...(isNil(districtId) ? {} : { districtId }),
  ...(isNil(countyId) ? {} : { countyId }),
  ...(isNil(placeName) ? {} : { placeName }),
  ...(isNil(startDate) && isNil(endDate)
    ? {}
    : { date: { ...(isNil(startDate) ? {} : { $gte: startDate }), ...(isNil(endDate) ? {} : { $lte: endDate }) } }),
})
export const getIrnTables = (params: GetIrnRepositoryTablesParams) =>
  get<IrnRepositoryTable>(IRN_TABLES)(buildGetIrnTablesQuery(params))

const insertMany = <T>(collection: string) => (data: T[]) => (client: MongoClient) =>
  data.length > 0
    ? client
        .db()
        .collection(collection)
        .insertMany(data)
    : Promise.resolve({} as InsertWriteOpResult)

export const addRIrnServices = (services: IrnServices) => insertMany(IRN_SERVICES)(services)

export const addDistricts = (districts: Districts) => insertMany(DISTRICTS)(districts)

export const addCounties = (counties: Counties) => insertMany(COUNTIES)(counties)

export const addIrnTables = (irnTables: IrnRepositoryTables) => insertMany(IRN_TABLES_TEMPORARY)(irnTables)

export const getConfig = getById<DbConfig>(DB_CONFIG)(1)

export const updateConfig = (dbConfig: DbConfig) => (client: MongoClient) =>
  client
    .db()
    .collection(DB_CONFIG)
    .updateOne({ _id: 1 }, { $set: { _id: 1, ...dbConfig } }, { upsert: true })

export const getIrnPlace = (placeName: string) => getById<IrnPlace>(IRN_PLACES)(placeName)

const buildGetIrnPlacesQuery = ({ districtId, countyId }: GetIrnRepositoryTablesParams) => ({
  ...(isNil(districtId) ? {} : { districtId }),
  ...(isNil(countyId) ? {} : { countyId }),
})
export const getIrnPlaces = (params: GetIrnPlacesParams) => get<IrnPlace>(IRN_PLACES)(buildGetIrnPlacesQuery(params))

export const updateIrnPlace = (irnPlace: IrnPlace) => (client: MongoClient) =>
  client
    .db()
    .collection(IRN_PLACES)
    .updateOne({ _id: irnPlace.name }, { $set: { _id: irnPlace.name, ...irnPlace } }, { upsert: true })

export const switchIrnTables = (client: MongoClient) =>
  client
    .db()
    .collection(IRN_TABLES_TEMPORARY)
    .rename(IRN_TABLES, { dropTarget: true })
