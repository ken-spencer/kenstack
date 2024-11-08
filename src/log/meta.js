import { headers } from "next/headers";

export default async function getLogMeta() {
  const headerList = await headers();

  const href = headerList.get("x-href");
  const ip = headerList.get("x-ip");
  const geo = headerList.get("x-geo")
    ? JSON.parse(headerList.get("x-geo"))
    : {};
  const userAgent = headerList.get("user-agent");

  const meta = {
    href,
    referer: headerList.get("referer"),
    ip,
    geo,
    userAgent,
  };
  return meta;
}
