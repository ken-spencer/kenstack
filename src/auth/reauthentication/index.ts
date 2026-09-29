import * as z from "zod";

export const authenticationWindowMs = 10 * 60 * 1000;

type Session = {
  authorizedUntil: Date;
  expiresAt: Date;
  impersonatedBy: number | null;
};

export function hasRecentAuthentication(session: Session | undefined) {
  return (
    session !== undefined &&
    session.impersonatedBy === null &&
    session.expiresAt.getTime() > Date.now() &&
    session.authorizedUntil.getTime() > Date.now()
  );
}

// A protected request names the account its page was rendered for, so it never writes to another.
export const protectedAccountSchema = z.object({
  userId: z.number().int().positive(),
});
