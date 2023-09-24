import "server-only";

import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI);

mongoose.addModel = function (name, schema) {
  /*
  schema.obj = {
    meta: {
      created: {
        type: Date,
        required: true,
        default: function() {
          return Date().now()
        }
      }
    }
    ...schema.obj
  }
*/
  return mongoose.models[name] || mongoose.model(name, schema);
};

export default mongoose;
