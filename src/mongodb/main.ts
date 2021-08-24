import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither"
import { Filter, MongoClient } from "mongodb"
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
  tryCatch(() => MongoClient.connect(mongoDbUri), error => new ServiceError((error as Error).message))

export const disconnect = (client: MongoClient) => client.close()

export const clearAll = (client: MongoClient) => client.db().dropDatabase()
export const clearAllIrnTablesTemporary = async (client: MongoClient) => {
  const cols = await client
    .db()
    .listCollections()
    .toArray()
  if (cols.map(c => c.name).includes(IRN_TABLES_TEMPORARY)) {
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
      .collection(collection)
      .findOne<T>({ _id: id.toString() })
}
function get<T>(collection: string) {
  return (query: Filter<any> = {}) => (client: MongoClient) => {
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
  countyId,
  date,
  districtId,
  endDate,
  endTime,
  placeName,
  region,
  serviceId,
  startDate,
  startTime,
  timeSlot,
}: GetIrnRepositoryTablesParams) => ({
  ...(isNil(serviceId) ? {} : { serviceId }),
  ...(isNil(region) ? {} : { region }),
  ...(isNil(districtId) ? {} : { districtId }),
  ...(isNil(countyId) ? {} : { countyId }),
  ...(isNil(placeName) ? {} : { placeName }),
  ...(isNil(date) ? {} : { date }),
  ...((isNil(startDate) && isNil(endDate)) || !isNil(date)
    ? {}
    : {
        date: {
          ...(isNil(startDate) ? {} : { $gte: startDate }),
          ...(isNil(endDate) ? {} : { $lte: endDate }),
        },
      }),
  ...(isNil(timeSlot)
    ? {}
    : {
        timeSlots: {
          $elemMatch: timeSlot,
        },
      }),
  ...((isNil(startTime) && isNil(endTime)) || !isNil(timeSlot)
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

export const addIrnLog = (irnLogInput: IrnLogInput) => (client: MongoClient) =>
  client
    .db()
    .collection<IrnLog>(IRN_LOG)
    .insertOne({ timestamp: currentUtcDateTime().format("YYYY-MM-DD HH:mm:ss"), ...irnLogInput })

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

const buildGetIrnPlacesQuery = ({ districtId, countyId, lastUpdatedTimestamp, active }: GetIrnPlacesParams) => ({
  ...(isNil(districtId) ? {} : { districtId }),
  ...(isNil(countyId) ? {} : { countyId }),
  ...(isNil(lastUpdatedTimestamp) ? {} : { lastUpdatedTimestamp: { $gt: lastUpdatedTimestamp } }),
  ...(isNil(active) ? {} : { active }),
})

export const getIrnPlaces = (params: GetIrnPlacesParams) => {
  const query = buildGetIrnPlacesQuery(params)
  return get<IrnPlace>(IRN_PLACES)(query)
}

export const updateIrnPlace = (irnPlace: Partial<IrnPlace>) => (client: MongoClient) =>
  client
    .db()
    .collection(IRN_PLACES)
    .updateOne({ _id: irnPlace.name }, { $set: { _id: irnPlace.name, ...irnPlace } }, { upsert: true })

export const updateActiveIrnPlaces = async (client: MongoClient) => {
  const maxUpdatedTimestamp = await client
    .db()
    .collection<IrnPlace>(IRN_PLACES)
    .find()
    .sort({ lastUpdatedTimestamp: -1 })
    .limit(1)
    .toArray()

  if (maxUpdatedTimestamp.length === 0) {
    return Promise.resolve()
  }

  const lastUpdatedTimestamp = maxUpdatedTimestamp[0].lastUpdatedTimestamp

  const updateActive = client
    .db()
    .collection(IRN_PLACES)
    .updateMany({ lastUpdatedTimestamp: { $gte: lastUpdatedTimestamp } }, { $set: { active: true } })
  const updateInactive = client
    .db()
    .collection(IRN_PLACES)
    .updateMany({ lastUpdatedTimestamp: { $lt: lastUpdatedTimestamp } }, { $set: { active: false } })

  return Promise.all([updateActive, updateInactive])
}
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

const updateIrnTableLocation = (client: MongoClient) => async (irnTable: IrnRepositoryTable & { _id: string }) => {
  const irnPlace = await getIrnPlace(irnTable.placeName)(client)
  return irnPlace
    ? client
        .db()
        .collection<IrnRepositoryTable>(IRN_TABLES)
        .updateOne({ _id: irnTable._id }, { $set: { ...irnTable, gpsLocation: irnPlace.gpsLocation } })
    : Promise.resolve(undefined)
}

export const updateIrnTablesLocation = async (client: MongoClient) => {
  const irnTables = await client
    .db()
    .collection<IrnRepositoryTable & { _id: string }>(IRN_TABLES)
    .find()
    .toArray()

  return Promise.all(irnTables.map(updateIrnTableLocation(client)))
}
