import "server-only";
import { cache } from "react";

import { jwtVerify } from "jose";
import errorLog from "../log/error";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.SECRET);

const verifyJWT = async (...roles) => {
  const cookie = cookies().get("auth");

  if (!cookie) {
    return false;
  }

  const { value: token } = cookie;

  if (!token) {
    return false;
  }

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

  if (roles.length === 0) {
    return claims;
  }

  if (Array.isArray(claims.roles)) {
    for (const role of roles) {
      if (claims.roles.includes(role)) {
        return claims;
      }
    }
  }
  return false;
};

// cache not defined in edge runtime
export default cache ? cache(verifyJWT) : verifyJWT;
