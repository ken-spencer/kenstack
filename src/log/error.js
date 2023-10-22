export default function errorLog(error, request, message = null) {
  const meta = {
    href: request.nextUrl.href,
    ip: request.ip ?? "127.0.0.1",
    geo: request.geo,
    userAgent: request.headers.get("user-agent"),
  };

  console.error(message, meta, error);
}
