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
export const clearAllIrnTablesTemporary = async (client: MongoClient) => {
  const cols = await client
    .db()
    .listCollections()
    .toArray()
  if (cols.includes(IRN_TABLES_TEMPORARY)) {
    client
      .db()
      .collection(IRN_TABLES_TEMPORARY)
      .drop()
  }
}

function getById<T>(collection: string) {
  return (id: any) => (client: MongoClient) =>
    client
      .db()
      .collection<T>(collection)
      .findOne({ _id: id.toString() })
}
function get<T>(collection: string) {
  return (query: FilterQuery<any> = {}) => (client: MongoClient) => {
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
  region,
  districtId,
  countyId,
  placeName,
  startDate,
  endDate,
  startTime,
  endTime,
}: GetIrnRepositoryTablesParams) => ({
  ...(isNil(serviceId) ? {} : { serviceId }),
  ...(isNil(region) ? {} : { region }),
  ...(isNil(districtId) ? {} : { districtId }),
  ...(isNil(countyId) ? {} : { countyId }),
  ...(isNil(placeName) ? {} : { placeName }),
  ...(isNil(startDate) && isNil(endDate)
    ? {}
    : { date: { ...(isNil(startDate) ? {} : { $gte: startDate }), ...(isNil(endDate) ? {} : { $lte: endDate }) } }),
  ...(isNil(startTime) && isNil(endTime)
    ? {}
    : {
        timeSlots: {
          $elemMatch: {
            ...(isNil(startTime) ? {} : { $gte: startTime }),
            ...(isNil(endTime) ? {} : { $lte: endTime }),
          },
        },
      }),
})
export const getIrnTables = (params: GetIrnRepositoryTablesParams) =>
  get<IrnRepositoryTable>(IRN_TABLES)(buildGetIrnTablesQuery(params))

const updateMany = <T extends { _id: string }>(collection: string) => (data: T[]) => (client: MongoClient) =>
  Promise.all(
    data.map(item =>
      client
        .db()
        .collection(collection)
        .updateOne({ _id: item._id }, { $set: item }, { upsert: true }),
    ),
  )

const insertMany = <T>(collection: string) => (data: T[]) => (client: MongoClient) =>
  data.length > 0
    ? client
        .db()
        .collection(collection)
        .insertMany(data)
    : Promise.resolve({} as InsertWriteOpResult)

export const addIrnServices = (services: IrnServices) =>
  updateMany(IRN_SERVICES)(services.map(s => ({ ...s, _id: s.serviceId.toString() })))

export const addDistricts = (districts: Districts) =>
  updateMany(DISTRICTS)(districts.map(d => ({ ...d, _id: d.districtId.toString() })))

export const addCounties = (counties: Counties) =>
  updateMany(COUNTIES)(counties.map(c => ({ ...c, _id: c.countyId.toString() })))

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

export const updateIrnPlace = (irnPlace: Partial<IrnPlace>) => (client: MongoClient) =>
  client
    .db()
    .collection(IRN_PLACES)
    .updateOne({ _id: irnPlace.name }, { $set: { _id: irnPlace.name, ...irnPlace } }, { upsert: true })

export const switchIrnTables = (client: MongoClient) =>
  client
    .db()
    .collection(IRN_TABLES_TEMPORARY)
    .rename(IRN_TABLES, { dropTarget: true })
