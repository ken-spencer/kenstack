import "server-only";

import { jwtVerify } from "jose";
import errorLog from "log/error";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.SECRET);

export default async function verifyJWT() {
  const cookie = cookies().get("auth");

  if (!cookie) {
    return false;
  }

  const { value: token } = cookie;

  let jwt;
  try {
    jwt = await jwtVerify(token, secret);
  } catch (e) {
    errorLog(e, "Problem decoding JWT token");
    return false;
  }

  if (!jwt) {
    return false;
  }

  const { payload: claims } = jwt;

  const now = Math.round(Date.now() / 1000);
  if (!claims || now > claims.exp) {
    return false;
  }

  return claims;
}
