const passwordChangeAuthenticationWindowMs = 5 * 60 * 1000;

export function hasRecentPasswordAuthentication(
  session:
    | {
        createdAt: Date;
        impersonatedBy: number | null;
        provider: string;
      }
    | undefined,
  now = new Date(),
) {
  return Boolean(
    session &&
    session.provider === "password" &&
    session.impersonatedBy === null &&
    now.getTime() - session.createdAt.getTime() <
      passwordChangeAuthenticationWindowMs,
  );
}
