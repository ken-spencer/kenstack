// import redis from "@kenstack/db/redis";
import mongoose from "mongoose";
const { Types } = mongoose;

import { cookies } from "next/headers";
import { cache } from "react";
import ms from "ms";

import { jwtVerify, SignJWT, errors as JoseErrors } from "jose";

import auditLog from "../log/audit";
import SessionModel, { SessionStore } from "@kenstack/models/Session";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default class Session {
  constructor(
    model,
    {
      loginPath = "/login",
      homePath = "/", // redirect here after login
      forgottenPasswordPath = "/forgotten-password",
      resetPasswordPath = "/reset-password",
      domain = null,
    } = []
  ) {
    // model.syncIndexes();
    this.userModel = model;
    this.loginPath = loginPath;
    this.homePath = homePath;
    // this.loginAPIPath = loginPath + "/api";
    this.forgottenPasswordPath = forgottenPasswordPath;
    this.resetPasswordPath = resetPasswordPath;
    this.domain = domain; // do,main to set cookies on.

    // session expires in 24 hours
    this.ttl = 3600 * 24 * 30;
  }

  async getClaims() {
    return await getClaims();
    // const cookieStore = await cookies();
    // const cookie = cookieStore.get("auth");

    // if (!cookie || !cookie.value) {
    //   return false;
    // }

    // const { value: token } = cookie;

    // let jwt;
    // try {
    //   jwt = await jwtVerify(token, secret);
    // } catch (e) {
    //   // eslint-disable-next-line no-console
    //   console.error(e.message);
    //   return false;
    // }

    // if (!jwt) {
    //   return false;
    // }

    // const { payload: claims } = jwt;

    // const now = Math.round(Date.now() / 1000);
    // if (!claims || now > claims.exp) {
    //   return false;
    // }

    // return claims;
  }

  async getAuthenticatedUser() {
    const claims = await this.getClaims();

    if (!claims) {
      return false;
    }

    return await loadUserById(this.userModel, claims.sub, claims.sid);
  }

  async isAuthenticated() {
    return (await this.getAuthenticatedUser()) ? true : false;
  }

  async hasRole(...roles) {
    if (roles.includes("ANONYMOUS")) {
      return true;
    }

    const user = await this.getAuthenticatedUser();

    if (!user) {
      return false;
    }

    if (roles.includes("AUTHENTICATED")) {
      return true;
    }

    for (const role of roles) {
      if (user.roles.includes(role)) {
        return true;
      }
    }

    return false;
  }

  async login(user, response, extraClaims = {}) {
    auditLog("login", null, {}, user);

    if (!(user instanceof this.userModel)) {
      throw Error("Invalid user  specified");
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.ttl);

    const session = new SessionModel({ user, expiresAt });
    await session.save();

    const resCookies = response ? response.cookies : await cookies();
    await this.#sessionCookies(
      resCookies,
      session._id.toString(),
      session.expiresAt,
      user,
      extraClaims
    );
  }

  async logout() {
    const claims = await this.getClaims();

    if (!claims) {
      return false;
    }

    const cookieStore = await cookies();
    cookieStore.delete("auth");

    if (this.doain) {
      cookieStore.delete("auth", {
        domain: this.domain,
      });
    }

    // cookies().set("auth", "", {
    //   httpOnly: true,
    //   domain: this.domain,
    //   secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production", // Safair won't allow this cookie otherwise
    //   sameSite: "Strict",
    //   expires: new Date(0),
    // });

    await SessionModel.deleteOne({ _id: claims.sid });

    return true;
  }

  async #sessionCookies(
    _cookies,
    sessionId,
    expiresAt,
    user,
    extraClaims = {}
  ) {
    const claims = {
      sub: user._id.toString(), // The UID of the user in your system
      sid: sessionId,
      roles: user?.roles.join(",") || "",
      ...extraClaims,
    };

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      // .setIssuer('urn:example:issuer')
      // .setExpirationTime("24h")
      .setExpirationTime(expiresAt.getTime() / 1000)
      .sign(secret);

    _cookies.set("auth", token, {
      httpOnly: true,
      domain: this.domain,
      secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production", // Safair won't allow this cookie otherwise
      sameSite: "Lax", // Strict can fail when doing a password request link from Gmail. ,
      expires: expiresAt.getTime(),
    });

    return true;
  }

  async revalidate(response = null) {
    const claims = await this.getClaims();

    if (!claims) {
      return false;
    }

    const now = Date.now();
    const secondsRemaining = Math.round(claims.exp - now / 1000);
    // if session is halfway expired extend the session
    if (secondsRemaining > this.ttl / 2) {
      return null;
    }

    const user = await this.getAuthenticatedUser();

    if (!user) {
      return false;
    }

    const date = new Date();
    date.setSeconds(date.getSeconds() + this.ttl);

    // session.expiresAt = date;
    // await session.save();

    await SessionModel.updateOne(
      { _id: new mongoose.Types.ObjectId(claims.sid) },
      {
        $set: {
          expiresAt: date,
        },
      }
    );

    const resCookies = response ? response.cookies : await cookies();
    await this.#sessionCookies(resCookies, claims.sid, date, user);

    auditLog("revalidate", null, {}, user);
    return true;
  }

  // Retrieve from session Store.
  async get(keys) {
    const claims = await this.getClaims();

    if (!claims) {
      return false;
    }

    // if (redis) {
    //   if (Array.isArray(keys)) {
    //     const names = keys.map((k) => k + "-" + claims.sub);
    //     return await redis.mget(...names);
    //   }
    //   const name = keys + "-" + claims.sub
    //   return await redis.get(name);
    // }

    if (Array.isArray(keys)) {
      const docs = await SessionStore.find(
        {
          user: new Types.ObjectId(claims.sub),
          key: { $in: keys },
        },
        { _id: 0, key: 1, value: 1 }
      );
      return keys.map((key) => {
        const d = docs.find((x) => x.key === key);
        return d?.value ?? null;
      });
    }

    const doc = await SessionStore.findOne(
      {
        user: new Types.ObjectId(claims.sub),
        key: keys,
      },
      { _id: 0, value: 1 }
    );

    return doc ? doc.value : false;
  }

  async set(key, value, ttl = null) {
    const claims = await this.getClaims();

    if (!claims) {
      return false;
    }

    // if (redis) {
    //   const name = key + "-" + claims.sub
    //   if (ttl) {
    //     const ex = typeof(ttl) === "number" ? ttl :  Math.round(ms(ttl) / 1000);

    //     return await redis.set(name, value, { ex });
    //   }
    //   return await redis.set(name, value)
    // }

    let expiresAt = null;
    if (ttl) {
      const ttlOffset = typeof ttl === "number" ? ttl * 1000 : ms(ttl);
      if (ttlOffset === undefined) {
        throw Error(`Invalid ttl ${ttl}`);
      }
      expiresAt = new Date(Date.now() + ttlOffset);
    }

    return await SessionStore.findOneAndUpdate(
      { user: new Types.ObjectId(claims.sub), key },
      {
        $set: {
          value,
          expiresAt,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        // new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  // this is async as it will often be extended
  async getHomePath() {
    return this.homePath;
  }
}

const getClaims = cache(async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("auth");

  if (!cookie || !cookie.value) {
    return false;
  }

  const { value: token } = cookie;

  let jwt;
  try {
    jwt = await jwtVerify(token, secret);
  } catch (e) {
    if (
      !(
        e instanceof JoseErrors.JWTExpired ||
        e instanceof JoseErrors.JWSSignatureVerificationFailed
      )
    ) {
      // eslint-disable-next-line no-console
      console.error(e.message);
    }
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
});

const loadUserById = cache(async (User, userId, sessionId) => {
  const [session] = await SessionModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(sessionId) } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
  ]);

  if (!session || !session.user || session.user._id != userId) {
    return false;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const user = User.hydrate(session.user);

  return user;
});
