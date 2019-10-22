import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither"
import { FilterQuery, MongoClient } from "mongodb"
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
import { currentUtcDateTime } from "../utils/dates"

const IRN_LOG = "IrnLog"
const IRN_SERVICES = "IrnServices"
const DISTRICTS = "Districts"
const COUNTIES = "Counties"
const IRN_TABLES_TEMPORARY = "_IrnTablesTemporary"
const IRN_TABLES = "IrnTables"
const IRN_PLACES = "IrnPlaces"

export type IrnLogType = "RefreshStarted" | "RefreshEnded"
export interface IrnLogInput {
  type: IrnLogType
  message: string
}

export interface IrnLog extends IrnLogInput {
  timestamp: string
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
export const getIrnService = (serviceId: number) => getById<IrnService>(IRN_SERVICES)(serviceId)
export const getIrnServices = get<IrnService>(IRN_SERVICES)()

export const getDistrict = (districtId: number) => getById<District>(DISTRICTS)(districtId)
export const getDistricts = get<District>(DISTRICTS)()

export const getCounty = (countyId: number) => getById<County>(COUNTIES)(countyId)
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

const upsertManyById = <T extends { _id: string }>(collection: string) => (data: T[]) =>
  upsertMany(collection)(data, (item: T) => ({ _id: item._id }))

const upsertMany = (collection: string) => <T>(data: T[], filter: (item: T) => {} = item => item) => (
  client: MongoClient,
) =>
  Promise.all(
    data.map(item =>
      client
        .db()
        .collection(collection)
        .updateOne(filter(item), { $set: item }, { upsert: true }),
    ),
  )

export const addIrnServices = (services: IrnServices) =>
  upsertManyById(IRN_SERVICES)(services.map(s => ({ ...s, _id: s.serviceId.toString() })))

export const addDistricts = (districts: Districts) =>
  upsertManyById(DISTRICTS)(districts.map(d => ({ ...d, _id: d.districtId.toString() })))

export const addCounties = (counties: Counties) =>
  upsertManyById(COUNTIES)(counties.map(c => ({ ...c, _id: c.countyId.toString() })))

export const addIrnLog = (log: IrnLogInput) => (client: MongoClient) =>
  client
    .db()
    .collection<IrnLog>(IRN_LOG)
    .insertOne({ timestamp: currentUtcDateTime().format("YYYY-MM-DD HH:mm:ss"), ...log })

export const getLastRefreshIrnLog = async (client: MongoClient) => {
  const logs = await client
    .db()
    .collection<IrnLog>(IRN_LOG)
    .find({ $or: [{ type: "RefreshStarted" }, { type: "RefreshEnded" }] })
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray()

  return logs.length > 0 ? logs[0] : undefined
}

export const removeOldLogs = (client: MongoClient) => {
  const lowerTimestamp = currentUtcDateTime()
    .add(-1, "day")
    .format("YYYY-MM-DD HH:mm:ss")
  return client
    .db()
    .collection<IrnLog>(IRN_LOG)
    .deleteMany({ timestamp: { $lte: lowerTimestamp } })
}

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

export const addIrnTablesTemporary = (irnTables: IrnRepositoryTables) => upsertMany(IRN_TABLES_TEMPORARY)(irnTables)

export const getIrnTables = (params: GetIrnRepositoryTablesParams) => {
  const query = buildGetIrnTablesQuery(params)
  return get<IrnRepositoryTable>(IRN_TABLES)(query)
}

export const getIrnTablesCount = (client: MongoClient) =>
  client
    .db()
    .collection(IRN_TABLES)
    .countDocuments()

export const getIrnTablesTemporaryCount = (client: MongoClient) =>
  client
    .db()
    .collection(IRN_TABLES_TEMPORARY)
    .countDocuments()

export const switchIrnTables = (client: MongoClient) =>
  client
    .db()
    .collection(IRN_TABLES_TEMPORARY)
    .rename(IRN_TABLES, { dropTarget: true })
