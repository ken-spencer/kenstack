import "server-only";

import mongoose from "../db";

export default class models {
  static models = new Map();
  static sessionTimeout = process.env.SESSION_TIMEOUT || 3600 * 24;

  constructor() {
    throw Error("models is a static class and cannot be instantiated");
  }

  static add(name, model) {
    models.models.set(name, model);
  }

  static async get(name) {
    // export default mongoose.addModel("User", UserSchema);

    const schemaRef = models.models.get(name);
    if (!schemaRef) {
      throw Error("Unable to find a schema for: " + name);
    }

    const { default: schema } = await schemaRef();
    const model = mongoose.connection.models[name];

    if (model && process.env.NODE_ENV === "development" && !schema.compiled) {
      delete mongoose.connection.models[name];
    } else if (model) {
      return model;
    }

    schema.compiled = true;
    return mongoose.model(name, schema);

    /*
    if (process.env.NODE_ENV === "development") {
      delete mongoose.connection.models[name];
    } else if (mongoose.connection.models[name]) {

      return mongoose.connection.models[name];
    }

    return mongoose.model(name, schema);
    */
  }
}
