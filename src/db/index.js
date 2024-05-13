import "server-only";

// import { auditLog } from "logger";
import mongoose from "mongoose";


function connect() {
  return mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false, // Disable automatic index creation
    maxPoolSize:50,
  }).then(() => {
  }, (e) => {
    // Mongoose never connects if it fails initial connectionn. Wait 15 seconds and retry
 
    // eslint-disable-next-line no-console
    console.error("Failed initial database connection. Retrying in 15 seconds...");
    setTimeout(() => {
      connect();
    }, 15000);
  })
}


connect();


mongoose.addModel = function (name, schema) {
  // hack to allow HMR to work.
  if (process.env.NODE_ENV === "development") {
    delete mongoose.connection.models[name];
  } else if (mongoose.connection.models[name]) {
    return mongoose.connection.models[name];
  }

  return mongoose.model(name, schema);
};

export default mongoose;
