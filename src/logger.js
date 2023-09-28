function pickRequest(request) {
  const retval = {
    href: request.nextUrl.href,
    ip: request.ip ?? "127.0.0.1",
    geo: request.geo,
    userAgent: request.headers.get("user-agent"),
  };

  return retval;
}

export function errorLog(error, request, message = null) {
  const meta = pickRequest(request);
  console.error(message, meta, error);
}

export function auditLog(
  request,
  key,
  message = null,
  data = null,
  user = null,
) {
  const meta = pickRequest(request);

  // Loading this dynamically to avoid a race condition with mongoose
  import("models/AuditLog").then(({ default: AuditLog }) => {
    const log = new AuditLog({
      key,
      message,
      user,
      ...meta,
      data,
    });
    log.save();
  });
}
