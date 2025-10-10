import { cookies } from "next/headers";
import { cache } from "react";
import { jwtVerify, SignJWT, errors as JoseErrors } from "jose";
import { getDb, findOne } from "@kenstack/lib/db";
import projectUser, { type User } from "./db/projectUser";
import { ObjectId } from "mongodb";
import auditLog from "./auditLog";

const ttl = 3600 * 24 * 30 * 1000; // 30 days
const alg = "HS256";

type Claims =
  | false
  | {
      sid: string;
      sub: string;
      ogSub: string; // when switching user
    };

const secret = new TextEncoder().encode(process.env.SECRET);
// const alg = "HS256";

export const getClaims = cache(async (): Promise<Claims> => {
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

  return claims;
});

export type AuthenticatedUser = User<{
  email: string;
  roles: string[];
}>;
export const getAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser | false> => {
    const claims = await getClaims();
    if (!claims) {
      return false;
    }

    const db = await getDb();

    const user = await db
      .collection("sessions")
      .aggregate<AuthenticatedUser>([
        { $match: { _id: new ObjectId(claims.sid) } },
        { $match: { expiresAt: { $gte: new Date() } } },
        {
          $lookup: {
            from: "users",
            let: { userId: "$user" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$userId"] },
                      { $eq: ["$meta.deleted", false] },
                    ],
                  },
                },
              },
            ],
            as: "user",
          },
        },
        { $unwind: "$user" },
        // { $match: { "user._id": new ObjectId(userId) } },
        { $replaceRoot: { newRoot: "$user" } },
        { $match: { "meta.deleted": false } },

        { $project: projectUser({ projection: { email: 1, roles: 1 } }) },
      ])
      .next();

    if (!user) {
      return false;
    }

    return user;
  }
);

export const hasRole = async (role: string | string[]): Promise<boolean> => {
  const roles = typeof role === "string" ? [role] : role;

  if (roles.includes("ANONYMOUS")) {
    return true;
  }
  const user = await getAuthenticatedUser();
  if (!user) {
    return false;
  }

  if (roles.includes("AUTHENTICATED")) {
    return true;
  }

  const userRoles = user.roles ?? [];
  return userRoles.some((v) => roles.includes(v));
};

type SessionUser = {
  _id: ObjectId;
  roles: string[];
};

export const login = async (
  userId: string | ObjectId,
  extraClaims: Record<string, unknown> = {}
): Promise<boolean> => {
  const id = userId instanceof ObjectId ? userId : new ObjectId(userId);
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne<SessionUser>(
      { _id: id, "meta.deleted": false },
      { projection: { _id: 1, roles: 1 } }
    );

  if (!user) {
    return false;
  }
  auditLog("login", null, null, userId);

  const expiresAt = new Date(Date.now() + ttl);

  const { insertedId: sessionId } = await db.collection("sessions").insertOne({
    user: user._id,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return await sessionCookies(
    sessionId.toHexString(),
    user,
    expiresAt,
    extraClaims
  );
};

export const logout = async () => {
  const claims = await getClaims();
  if (!claims) {
    return;
  }

  /** exit super user */
  if (claims.ogSub) {
    const user = await findOne(
      "users",
      {
        _id: new ObjectId(claims.ogSub),
      },
      { projection: { roles: 1 } }
    );
    if (user && user?.roles.includes("ADMIN")) {
      await login(user._id);
      await auditLog("exitUser", null, { id: claims.sub }, claims.ogSub);
      return true;
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("auth");

  const db = await getDb();
  await db.collection("sessions").deleteOne({ _id: new ObjectId(claims.sid) });
  return true;
};

export const revalidate = async () => {
  // TODO
};

const sessionCookies = async (
  sessionId: string,
  user: SessionUser,
  expiresAt: Date,
  extraClaims: Record<string, unknown> = {}
): Promise<boolean> => {
  const cookieStore = await cookies();

  const claims = {
    sub: user._id.toString(),
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

  cookieStore.set("auth", token, {
    httpOnly: true,
    // domain: this.domain,
    secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production", // Safari won't allow this cookie otherwise
    sameSite: "lax", // Strict can fail when doing a password request link from Gmail. ,
    expires: expiresAt.getTime(),
  });

  return true;
};
