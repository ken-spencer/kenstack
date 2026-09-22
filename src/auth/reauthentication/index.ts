const passwordChangeAuthenticationWindowMs = 5 * 60 * 1000;

type Session = {
  createdAt: Date;
  impersonatedBy: number | null;
};

export function hasRecentAuthentication(
  session: Session | undefined,
  now = new Date(),
  graceMs = 0,
) {
  return Boolean(
    session &&
    session.impersonatedBy === null &&
    getAuthenticationRemainingMs(session, now) + graceMs > 0,
  );
}

export function getAuthenticationRemainingMs(
  session: Session,
  now = new Date(),
) {
  return (
    passwordChangeAuthenticationWindowMs -
    (now.getTime() - session.createdAt.getTime())
  );
}
