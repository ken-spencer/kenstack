import { MongoClient } from "mongodb";

let cachedDb = null;
export default function connect(server) {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;

  cachedDb = MongoClient.connect(uri, {
    useNewUrlParser: true,
    poolSize: 5,
    useUnifiedTopology: true, // get a deprecation warning without this
  }).then(
    (db) => {
      return db;
    },
    (e) => {
      server.error(new Error("Problem connectingto db"), e);
      return false;
    },
  );

  return cachedDb;
}
