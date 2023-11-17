import AuditLog from "../models/AuditLog";
import getLogMeta from "./meta";
import loadUser from "../auth/loadUser";

export default async function auditLog(
  key,
  message = null,
  data = null,
  user = null,
) {
  const meta = getLogMeta();

  if (user === null) {
    user = await loadUser();
  }

  // Loading this dynamically to avoid a race condition with mongoose
  const log = new AuditLog({
    key,
    message,
    user,
    ...meta,
    data,
  });
  log.save();
}
