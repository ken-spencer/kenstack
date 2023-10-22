import "server-only";

// import { auditLog } from "logger";
import mongoose from "mongoose";

// todo workaround for HMR. It remove old model before added new ones
/*
Object.keys(mongoose.connection.models).forEach(key => {
  delete mongoose.connection.models[key];
});
*/

mongoose.connect(process.env.MONGO_URI);

/*
mongoose.addModel = function (name: string, schema: Schema) {
  // hack to allow HMR to work.
  if (process.env.NODE_ENV === "development") {
    delete mongoose.connection.models[name];
  }

  return mongoose.model(name, schema);
};
*/

mongoose.addModel = function (name, schema) {
  // hack to allow HMR to work.
  if (process.env.NODE_ENV === "development") {
    delete mongoose.connection.models[name];
  }

  return mongoose.model(name, schema);
};

export default mongoose;
