import "server-only";

// import { auditLog } from "logger";
import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI, {
  autoIndex: false, // Disable automatic index creation
});

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
