const passwordChangeAuthenticationWindowMs = 5 * 60 * 1000;

type Session = {
  createdAt: Date;
  impersonatedBy: number | null;
};

export function hasRecentAuthentication(
  session: Session | undefined,
  now = new Date(),
) {
  return Boolean(
    session &&
    session.impersonatedBy === null &&
    now.getTime() - session.createdAt.getTime() <
      passwordChangeAuthenticationWindowMs,
  );
}

// The stored password is confirmed before it is replaced unless the session
// was just authenticated; an account without one has nothing to confirm.
export function requiresCurrentPassword(
  user: { passwordHash: string | null },
  session: Session,
  now = new Date(),
): user is { passwordHash: string } {
  return user.passwordHash !== null && !hasRecentAuthentication(session, now);
}
