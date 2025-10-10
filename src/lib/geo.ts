import { headers } from "next/headers";

type GeoInfo = {
  continent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  timezone: string | null;
  postalCode: string | null;
};

async function getGeo(): Promise<GeoInfo> {
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
