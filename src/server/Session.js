import { cookies } from "next/headers";
// import { URLSearchParams } from "url";
import { cache } from "react";

import { jwtVerify, SignJWT } from "jose";

import auditLog from "../log/audit";
import SessionModel from "@admin/models/Session";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default class Session {
  constructor(
    model,
    {
      loginPath = "/login",
      homePath = "/admin", // redirect here after login
      forgottenPasswordPath = "/forgotten-password",
      resetPasswordPath = "/reset-password",
    } = [],
  ) {
    // model.syncIndexes();
    this.userModel = model;
    this.loginPath = loginPath;
    this.homePath = homePath;
    // this.loginAPIPath = loginPath + "/api";
    this.forgottenPasswordPath = forgottenPasswordPath;
    this.resetPasswordPath = resetPasswordPath;

    // session expires in 24 hours
    this.ttl = 3600 * 24;
  }

  async getClaims() {
    const cookie = cookies().get("auth");

    if (!cookie || !cookie.value) {
      return false;
    }

    const { value: token } = cookie;

    let jwt;
    try {
      jwt = await jwtVerify(token, secret);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message);
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

  async login(user, response) {
    auditLog("login", null, {}, user);

    if (!(user instanceof this.userModel)) {
      throw Error("Invalid user  specified");
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.ttl);

    const session = new SessionModel({ user, expiresAt });
    await session.save();

    const resCookies = response ? response.cookies : cookies();
    await this.#sessionCookies(resCookies, session, user);
  }

  async #sessionCookies(_cookies, session, user) {
    const claims = {
      sub: user._id.toString(), // The UID of the user in your system
      sid: session._id.toString(),
      roles: user.roles,
    };

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      // .setIssuer('urn:example:issuer')
      // .setExpirationTime("24h")
      .setExpirationTime(session.expiresAt.getTime() / 1000)
      .sign(secret);

    _cookies.set("auth", token, {
      httpOnly: true,
      secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production", // Safair won't allow this cookie otherwise
      sameSite: "Strict",
      expires: session.expiresAt.getTime(),
    });

    const publicToken = {
      expires: session.expiresAt.getTime(),
      roles: user.roles,
    };

    let json = JSON.stringify(publicToken);
    let encodedString = Buffer.from(json, "utf-8").toString("base64");

    _cookies.set("authPublic", encodedString, {
      httpOnly: false,
      secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production", // Safair won't allow this cookie otherwise
      sameSite: "Strict",
      expires: session.expiresAt.getTime(),
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
    const session = user.session;

    // handle possible edge case where this function is called in rapid succession. Only want to update once.
    // Does not appear to fire though.
    /*
    if (secondsRemaining - Math.round((session.expiresAt.getTime() - now) / 1000) !== 0) {
      return false;
    }
    */

    // additional security check, may want to audit this

    if (session.user._id.toString() !== claims.sub) {
      return false;
    }

    // extend session date to max of 1 hour
    const date = new Date();
    date.setSeconds(date.getSeconds() + this.ttl);

    session.expiresAt = date;
    await session.save();

    const resCookies = response ? response.cookies : cookies();
    await this.#sessionCookies(resCookies, session, user);

    auditLog("revalidate", null, {}, session.user);
    return true;
  }
}

const loadUserById = cache(async (User, userId, sessionId) => {
  const session = await SessionModel.findById(sessionId).populate({
    path: "user",
    model: User,
  });

  // User.syncIndexes()

  if (!session || !session.user || session.user._id != userId) {
    return false;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const user = session.user;

  // ensure this is safe. There is likely a more orthodox way.

  // temporarilly link session
  user.session = session;

  return user;
});
