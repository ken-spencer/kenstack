import AuditLog from "models/AuditLog";

export default function auditLog(
  request,
  key,
  message = null,
  data = null,
  user = null,
) {
  const meta = {
    href: request.nextUrl.href,
    ip: request.ip ?? "127.0.0.1",
    geo: request.geo,
    userAgent: request.headers.get("user-agent"),
  };

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
