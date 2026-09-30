import { headers } from "next/headers";

export type GeoInfo = Awaited<ReturnType<typeof getGeo>>;

export async function getGeo() {
  const hdrs = await headers();
  const geo = {
    continent: hdrs.get("x-vercel-ip-continent"),
    country: hdrs.get("x-vercel-ip-country"),
    region: hdrs.get("x-vercel-ip-country-region"),
    city: hdrs.get("x-vercel-ip-city"),
    latitude: hdrs.get("x-vercel-ip-latitude"),
    longitude: hdrs.get("x-vercel-ip-longitude"),
    timezone: hdrs.get("x-vercel-ip-timezone"),
    postalCode: hdrs.get("x-vercel-ip-postal-code"),
  };
  return geo;
}

export default getGeo;
