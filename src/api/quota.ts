import "server-only";

import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";

import { db } from "@app/db";
import { quotaUses } from "@kenstack/db/tables/quotas";
import type { Database, DbTransaction } from "@kenstack/db/types";
import errorLog from "@kenstack/lib/errorLog";
import { type DurationString, parseDuration } from "@kenstack/lib/duration";

const quotaSubjects = ["email", "ip"] as const;
type QuotaSubject = (typeof quotaSubjects)[number];

// Per subject (an email address or a client IP): how many uses within a window.
type QuotaLimits = Record<
  QuotaSubject,
  readonly [max: number, within: DurationString]
>;

// What each subject may do within a scope unless the call site says otherwise.
const defaultLimits: QuotaLimits = {
  email: [12, "1 hour"],
  ip: [10, "15 minutes"],
};

// What each subject may do across every scope combined. Checked from the same
// query as the scoped limit, so its window must be at least as long as any
// scoped window.
const siteLimits: QuotaLimits = {
  email: [30, "1 hour"],
  ip: [60, "1 hour"],
};

type QuotaOptions = {
  // Already-normalized address (schemas trim and lowercase). Omit when the
  // action has no email subject.
  email?: string;
  // Client IP of a public action, from getIp(request). Omit it when the quota
  // gates one account (sign-in, password failures), so unrelated traffic behind
  // a shared IP cannot lock that account.
  ip?: string;
  // Per-subject limits for this call; the defaults above apply otherwise.
  limits?: Partial<QuotaLimits>;
};

// Returned when a limit is reached: which subject hit it, and a generic message
// for call sites that have nothing more specific to say.
type QuotaExceeded = { message: string; subject: QuotaSubject };

const exceededMessage = "Too many requests. Please try again later.";

type ResolvedQuota = {
  email: string | null;
  ip: string | null;
  limits: QuotaLimits;
  scope: string;
};

function resolveQuota(scope: string, options: QuotaOptions): ResolvedQuota {
  const normalizedScope = scope.trim();
  if (!normalizedScope) {
    throw new Error("Quota scope is required");
  }

  const limits = { ...defaultLimits, ...options.limits };
  for (const subject of quotaSubjects) {
    const [max, within] = limits[subject];
    if (!Number.isSafeInteger(max) || max < 1) {
      throw new Error("Quota limits require a positive integer maximum");
    }
    if (parseDuration(within) > parseDuration(siteLimits[subject][1])) {
      throw new RangeError(
        `Quota ${subject} windows cannot exceed the site-wide window`,
      );
    }
  }

  const email = options.email ?? null;
  const ip = options.ip ?? null;
  if (!email && !ip) {
    throw new Error(`Quota ${normalizedScope} needs an email or IP subject`);
  }

  return { email, ip, limits, scope: normalizedScope };
}

async function checkResolvedQuota(
  db: Pick<Database, "select">,
  { email, ip, limits, scope }: ResolvedQuota,
): Promise<QuotaExceeded | null> {
  const now = Date.now();

  for (const subject of quotaSubjects) {
    const value = subject === "email" ? email : ip;
    if (!value) {
      continue;
    }

    const [max, within] = limits[subject];
    const [siteMax, siteWithin] = siteLimits[subject];
    const [{ site, scoped }] = await db
      .select({
        site: count(),
        scoped: count(
          sql`case when ${and(
            eq(quotaUses.scope, scope),
            gte(quotaUses.createdAt, new Date(now - parseDuration(within))),
          )} then 1 end`,
        ),
      })
      .from(quotaUses)
      .where(
        and(
          eq(quotaUses[subject], value),
          gte(quotaUses.createdAt, new Date(now - parseDuration(siteWithin))),
        ),
      );

    if (site >= siteMax || scoped >= max) {
      await errorLog({
        name: "quota-exceeded",
        context: { scope, subject, site, scoped },
      });
      return { message: exceededMessage, subject };
    }
  }

  return null;
}

function scheduleCleanup(now: Date) {
  // Serverless has no cleanup timer; a small sample of writes sweeps old rows.
  if (Math.random() < 0.001) {
    const dayAgo = new Date(now.getTime() - parseDuration("1 day"));
    waitUntil(db.delete(quotaUses).where(lte(quotaUses.createdAt, dayAgo)));
  }
}

// Uses are counted separately for each given subject (email, IP), both within
// the scope and site-wide. Returns null when every limit has room, otherwise the
// first exceeded subject.
export async function checkQuota(
  scope: string,
  options: QuotaOptions = {},
): Promise<QuotaExceeded | null> {
  return checkResolvedQuota(db, resolveQuota(scope, options));
}

// Counts one use without checking (e.g. after a failed login).
export async function consumeQuota(scope: string, options: QuotaOptions = {}) {
  const quota = resolveQuota(scope, options);
  const now = new Date();
  await db.insert(quotaUses).values({
    scope: quota.scope,
    email: quota.email,
    ip: quota.ip,
    createdAt: now,
  });
  scheduleCleanup(now);
}

// Atomic check-then-record. Same return as checkQuota; a use is recorded only
// when it returns null. A caller already inside a transaction passes it so the
// claim shares its connection and rolls back with it.
export async function claimQuota(
  scope: string,
  options: QuotaOptions = {},
  transaction?: DbTransaction,
) {
  const quota = resolveQuota(scope, options);
  const claim = async (tx: DbTransaction) => {
    // Site-wide limits span scopes, so claims serialize by subject and value.
    for (const lock of quotaSubjects
      .flatMap((subject) => {
        const value = quota[subject];
        return value ? [`quota:${subject}:${value}`] : [];
      })
      .sort()) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lock}))`);
    }

    const exceeded = await checkResolvedQuota(tx, quota);
    if (exceeded) {
      return exceeded;
    }

    const now = new Date();
    await tx.insert(quotaUses).values({
      scope: quota.scope,
      email: quota.email,
      ip: quota.ip,
      createdAt: now,
    });
    scheduleCleanup(now);
    return null;
  };
  return transaction ? claim(transaction) : db.transaction(claim);
}
