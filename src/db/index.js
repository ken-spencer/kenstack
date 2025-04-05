import "server-only";

// import { auditLog } from "logger";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) {
  throw Error(
    "MONGO_URI environment variable is required to connect to Mongodb",
  );
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      autoIndex: true, // Toggle automatic index creation
      maxPoolSize: 10,
    };

    cached.promise = mongoose
      .connect(process.env.MONGO_URI, opts)
      .then((connection) => {
        connection.addModel = function (name, schema) {
          // hack to allow HMR to work.
          if (process.env.NODE_ENV === "development") {
            delete connection.models[name];
          } else if (connection.models[name]) {
            return connection.models[name];
          }

          return connection.model(name, schema);
        };

        return connection;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// return mongoose
//   .connect(process.env.MONGO_URI, {
//     autoIndex: true, // Toggle automatic index creation
//     maxPoolSize: 50,
//   })
//   .then(
//     () => {},
//     (e) => {
//       // Mongoose never connects if it fails initial connectionn. Wait 15 seconds and retry

//       // eslint-disable-next-line no-console
//       console.error(
//         "Failed initial database connection. Retrying in 15 seconds...",
//       );
//       setTimeout(() => {
//         connect();
//       }, 15000);
//     },
//   );
// }

// await onnect();

// export default mongoose;
