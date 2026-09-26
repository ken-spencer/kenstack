export const authenticationWindowMs = 10 * 60 * 1000;

type Session = {
  authorizedUntil: Date;
  expiresAt: Date;
  impersonatedBy: number | null;
};

export function hasRecentAuthentication(
  session: Session | undefined,
  graceMs = 0,
) {
  return (
    session !== undefined &&
    session.impersonatedBy === null &&
    session.expiresAt.getTime() > Date.now() &&
    session.authorizedUntil.getTime() - Date.now() + graceMs > 0
  );
}
