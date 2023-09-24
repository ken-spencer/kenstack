import { jwtVerify, SignJWT } from "jose";
import { errorLog } from "logger";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export async function authenticate(request) {
  const cookie = request.cookies.get("auth");

  if (!cookie) {
    return false;
  }

  const { value: token } = cookie;

  let jwt;
  try {
    jwt = await jwtVerify(token, secret);
  } catch (e) {
    errorLog(e, request, "Problem decoding JWT token");
    return false;
  }

  if (!jwt) {
    return false;
  }

  const { payload: claims } = jwt;

  return claims;
}

export async function signature(claims) {
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    // .setIssuer('urn:example:issuer')
    // .setAudience('urn:example:audience')
    .setExpirationTime("2h")
    .sign(secret);

  return token;
}

export function getClaims(user) {
  const claims = {
    // iss: "https://" + req.headers.host + "/", // The URL of your service
    sub: user._id.toString(), // The UID of the user in your system
    // scope: ['AUTHENTICATED', 'EVERYONE'], // role access for user.
  };

  return claims;
}

export async function setToken(user, response) {
  const claims = getClaims(user);
  const token = await signature(claims);
  response.cookies.set("auth", token, {
    httpOnly: true,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour,
    // secure: true,
  });
}
