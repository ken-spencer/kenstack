import { randomBytes, createHash } from "crypto";

/** generate the token to store in the browser */
export function generateToken() {
  return randomBytes(32).toString("base64url");
}

/** hash the token to store in the db.  */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
