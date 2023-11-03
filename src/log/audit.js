import AuditLog from "models/AuditLog";
import getLogMeta from "./meta";

export default function auditLog(
  key,
  message = null,
  data = null,
  user = null,
) {
  const meta = getLogMeta();

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
