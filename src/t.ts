import { MongoClient } from "mongodb"
import { globalDistricts } from "./staticData/districts"

const test = async () => {
  const client = await MongoClient.connect("mongodb://localhost:27017/test", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const cols0 = await client.db().collections()
  console.log(`COLLECTION}=====>\n`, cols0.map(c => c.collectionName))

  await client
    .db()
    .collection("TEST1")
    .insertMany(globalDistricts)

  const cols = await client.db().collections()
  console.log(`COLLECTION}=====>\n`, cols.map(c => c.collectionName))

  await client
    .db()
    .collection("TEST1")
    .rename("TEST2", { dropTarget: true })

  const d = await client
    .db()
    .collection("TEST2")
    .find({})
    .toArray()

  console.log("Districts", d.map(c => c.name))

  const cols2 = await client.db().collections()
  console.log(`COLLECTION}=====>\n`, cols2.map(c => c.collectionName))

  await client.close()
}

test()
