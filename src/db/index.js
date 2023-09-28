import "server-only";

import { auditLog } from "logger";
import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI);

mongoose.addModel = function (name, schema, { saveLog = true } = {}) {
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

  if (saveLog) {
    schema.methods.saveLog = function (request, user = null) {
      const message = this.$isNew ? "CREATE" : "UPDATE";

      auditLog(
        request,
        name,
        message,
        { _id: this._id, ...this.getChanges() },
        user,
      );
      return this.save();
    };
  }

  return mongoose.models[name] || mongoose.model(name, schema);
};

export default mongoose;
