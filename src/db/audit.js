import auditLog from "../log/audit";

function saveLog(user) {
  const message = this.$isNew ? "CREATE" : "UPDATE";

  const modelName = this.constructor.modelName;
  auditLog(
    "save",
    message,
    {
      _id: this._id,
      modelName,
      changes: this.getChanges(),
    },
    user,
  );
  return this.save();
}

export default function audit(schema) {
  schema.methods.saveLog = saveLog;
}
