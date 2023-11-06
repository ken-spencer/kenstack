import auditLog from "../log/audit";

const methods = (name) => ({
  saveLog: function (user) {
    const message = this.$isNew ? "CREATE" : "UPDATE";

    auditLog(name, message, { _id: this._id, ...this.getChanges() }, user);
    return this.save();
  },
});

// A mixin to add auditing to mongoose schemas.
export default function audit(name, schema) {
  Object.assign(schema.methods, methods(name));
}
