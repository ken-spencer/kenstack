import "server-only";

import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { waitUntil } from "@vercel/functions";

import { db } from "@app/db";
import { quotaUses } from "@kenstack/db/tables/quotas";
import type { DbTransaction } from "@kenstack/db/types";
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

// The given subjects, each with its limits and the start of its windows.
function listSubjects({ email, ip, limits }: ResolvedQuota, now: number) {
  return quotaSubjects.flatMap((subject) => {
    const value = subject === "email" ? email : ip;
    if (!value) return [];
    const [max, within] = limits[subject];
    const [siteMax, siteWithin] = siteLimits[subject];
    return [
      {
        subject,
        value,
        max,
        siteMax,
        since: new Date(now - parseDuration(within)),
        siteSince: new Date(now - parseDuration(siteWithin)),
      },
    ];
  });
}

// One row counting each given subject's uses, site-wide as `${subject}Site` and within the scope as
// `${subject}Scoped`.
function countUses(quota: ResolvedQuota, now: number) {
  const subjects = listSubjects(quota, now);
  return new QueryBuilder()
    .select(
      Object.fromEntries(
        subjects.flatMap(({ subject, value, since, siteSince }) => {
          const site = and(
            eq(quotaUses[subject], value),
            gte(quotaUses.createdAt, siteSince),
          );
          return [
            [
              `${subject}Site`,
              sql<number>`(count(*) filter (where ${site}))::int`.as(
                `${subject}Site`,
              ),
            ],
            [
              `${subject}Scoped`,
              sql<number>`(count(*) filter (where ${and(
                site,
                eq(quotaUses.scope, quota.scope),
                gte(quotaUses.createdAt, since),
              )}))::int`.as(`${subject}Scoped`),
            ],
          ];
        }),
      ),
    )
    .from(quotaUses)
    .where(
      or(
        ...subjects.map(({ subject, value, siteSince }) =>
          and(
            eq(quotaUses[subject], value),
            gte(quotaUses.createdAt, siteSince),
          ),
        ),
      ),
    );
}

// The first given subject whose counted uses reached a limit, or null.
async function findExceeded(
  counts: Record<string, number>,
  quota: ResolvedQuota,
): Promise<QuotaExceeded | null> {
  for (const { subject, max, siteMax } of listSubjects(quota, Date.now())) {
    const site = counts[`${subject}Site`];
    const scoped = counts[`${subject}Scoped`];
    if (site >= siteMax || scoped >= max) {
      await errorLog({
        name: "quota-exceeded",
        context: { scope: quota.scope, subject, site, scoped },
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
  const quota = resolveQuota(scope, options);
  const [counts] = await db.execute<Record<string, number>>(
    countUses(quota, Date.now()),
  );
  return findExceeded(counts, quota);
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
    const now = Date.now();
    const subjects = listSubjects(quota, now);
    // Site-wide limits span scopes, so claims serialize by subject and value. The keys are sorted,
    // and ordering by their ordinality makes the lock order the array order, so claims never
    // deadlock. The locks take their own statement: a statement reads from a snapshot taken as it
    // starts, so counting in the statement that waited for a lock would miss a claim committed while
    // it waited.
    const keys = subjects
      .map(({ subject, value }) => `quota:${subject}:${value}`)
      .sort();
    await tx.execute(sql`
      select pg_advisory_xact_lock(hashtext(key))
      from unnest(${sql.param(keys)}::text[]) with ordinality as locks(key, ordinal)
      order by ordinal
    `);
    // The use is recorded only while every count is under its limit.
    const [counts] = await tx.execute<Record<string, number>>(sql`
      with counts as ${countUses(quota, now)},
      claimed as (
        insert into ${quotaUses} (scope, email, ip, created_at)
        select ${quota.scope}, ${quota.email}, ${quota.ip}, ${new Date(now).toISOString()}::timestamptz
        from counts
        where ${sql.join(
          subjects.map(
            ({ subject, max, siteMax }) =>
              sql`${sql.identifier(`${subject}Site`)} < ${siteMax} and ${sql.identifier(`${subject}Scoped`)} < ${max}`,
          ),
          sql` and `,
        )}
        returning 1
      )
      select counts.*, (select count(*) from claimed)::int as claimed from counts
    `);
    if (!counts.claimed) return findExceeded(counts, quota);
    scheduleCleanup(new Date(now));
    return null;
  };
  return transaction ? claim(transaction) : db.transaction(claim);
}
