import "server-only";

import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export function createChallengeSecrets() {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeSalt = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("base64url");

  return {
    challengeKey: randomUUID(),
    code,
    codeHash: hashVerificationCode(code, codeSalt),
    codeSalt,
    token,
    tokenHash: hashVerificationToken(token),
  };
}

export function createFreshChallengeSecrets(
  previousCodes: readonly { codeHash: string; codeSalt: string }[],
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = createChallengeSecrets();
    if (
      !previousCodes.some(({ codeHash, codeSalt }) =>
        isVerificationCodeMatch(candidate.code, codeSalt, codeHash),
      )
    ) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a fresh verification code.");
}

export function createVerificationKey() {
  return randomBytes(32).toString("base64url");
}

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashVerificationKey(verificationKey: string) {
  return createHash("sha256").update(verificationKey).digest("hex");
}

export function isVerificationCodeMatch(
  code: string,
  codeSalt: string,
  expectedHash: string,
) {
  const actual = Buffer.from(hashVerificationCode(code, codeSalt), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashVerificationCode(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("hex");
}
