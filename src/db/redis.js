import { Redis } from "@upstash/redis";
let redis = false;

if (process.env.UPSTASH_REDIS_URL) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });
}

export default redis;
