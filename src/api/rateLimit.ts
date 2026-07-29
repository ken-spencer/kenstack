import "server-only";

import { createHash } from "node:crypto";

import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { ipAddress, waitUntil } from "@vercel/functions";

import { deps } from "@app/deps";
import { rateLimitEvents } from "@kenstack/db/tables/rateLimits";
import { type DurationString, parseDuration } from "@kenstack/lib/duration";
import errorLog from "@kenstack/lib/errorLog";

// Serverless instances cannot keep a cleanup timer, so a small sample of
// requests sweeps expired events, off the request's critical path.
const cleanupSampleRate = 0.01;

export type RateLimit = {
  max: number;
  within: DurationString;
};

const overallEmailLimits = [
  { max: 12, within: "1 hour" },
] satisfies readonly RateLimit[];

type ResolvedRateLimit = {
  keyHash: string;
  max: number;
  namespace: string;
  scope: string;
  subject: "email" | "ip";
  windowMs: number;
};

// Validates quota limits and builds the database scopes used for request counting.
function resolveRateLimitRules({
  limits,
  namespace,
  subject,
  value,
}: {
  limits: readonly RateLimit[];
  namespace: string;
  subject: ResolvedRateLimit["subject"];
  value: string;
}) {
  const keyHash = createHash("sha256")
    .update(`${subject}\0${value}`)
    .digest("hex");
  const scope = `${namespace}:${subject}:${keyHash}`;
  const rules: ResolvedRateLimit[] = [];

  for (const { max, within } of limits) {
    if (!Number.isSafeInteger(max) || max < 1) {
      throw new Error("Rate limits require a positive integer maximum");
    }

    rules.push({
      keyHash,
      max,
      namespace,
      scope,
      subject,
      windowMs: parseDuration(within),
    });
  }

  return rules;
}

// Claims workflow quotas and a cross-workflow quota for one email address to limit flooding.
export default async function rateLimitEmailRequest({
  email: rawEmail,
  limits,
  name: rawName,
  request,
}: {
  email: string;
  limits: {
    email?: readonly RateLimit[];
    ip?: readonly RateLimit[];
  };
  name: string;
  request: NextRequest;
}) {
  const namespace = rawName.trim();
  const email = rawEmail.trim().toLowerCase();

  if (!namespace) {
    throw new Error("Rate-limit name is required");
  }
  if (!email) {
    throw new Error("Rate-limit email subject is required");
  }

  const rules = resolveRateLimitRules({
    limits: overallEmailLimits,
    namespace: "public-email",
    subject: "email",
    value: email,
  });
  if (limits.email && limits.email.length) {
    rules.push(
      ...resolveRateLimitRules({
        limits: limits.email,
        namespace,
        subject: "email",
        value: email,
      }),
    );
  }

  if (limits.ip && limits.ip.length) {
    const ip = ipAddress(request)?.trim();
    if (ip) {
      rules.push(
        ...resolveRateLimitRules({
          limits: limits.ip,
          namespace,
          subject: "ip",
          value: ip,
        }),
      );
    }
  }

  return applyRateLimits(rules, namespace);
}

// Claims quotas for the client IP so callers can limit work before external verification.
export async function rateLimitIpRequest({
  limits,
  name: rawName,
  request,
}: {
  limits: readonly RateLimit[];
  name: string;
  request: NextRequest;
}) {
  const namespace = rawName.trim();
  if (!namespace) {
    throw new Error("Rate-limit name is required");
  }

  if (!limits.length) {
    return { allowed: true as const };
  }

  const ip = ipAddress(request)?.trim();
  if (!ip) {
    return { allowed: true as const };
  }

  const rules = resolveRateLimitRules({
    limits,
    namespace,
    subject: "ip",
    value: ip,
  });
  return applyRateLimits(rules, namespace);
}

// Runs cleanup and rejection logging around the shared atomic quota claim.
async function applyRateLimits(
  rules: readonly ResolvedRateLimit[],
  namespace: string,
) {
  const now = new Date();
  if (Math.random() < cleanupSampleRate) {
    waitUntil(
      deps.db
        .delete(rateLimitEvents)
        .where(lte(rateLimitEvents.expiresAt, now)),
    );
  }

  const quota = await claimRateLimitQuota(rules, now);
  if (quota.allowed) {
    return quota;
  }

  await errorLog({
    name: "rate-limit-rejected",
    context: {
      name: namespace,
      retryAfter: quota.retryAfter,
    },
  });
  return quota;
}

// Atomically claims every resolved quota so concurrent requests cannot exceed a shared limit.
async function claimRateLimitQuota(
  rules: readonly ResolvedRateLimit[],
  now: Date,
) {
  if (!rules.length) {
    return { allowed: true as const };
  }

  // Keep the widest window per scope so queries see every relevant event and
  // stored events remain available to every rule for that subject.
  const scopes = new Map<string, ResolvedRateLimit>();
  for (const rule of rules) {
    const existing = scopes.get(rule.scope);
    if (!existing || rule.windowMs > existing.windowMs) {
      scopes.set(rule.scope, rule);
    }
  }

  return deps.db.transaction(async (tx) => {
    for (const scope of Array.from(scopes.keys()).sort()) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${scope}))`);
    }

    const conditions = [];
    for (const scope of scopes.values()) {
      conditions.push(
        and(
          eq(rateLimitEvents.namespace, scope.namespace),
          eq(rateLimitEvents.subject, scope.subject),
          eq(rateLimitEvents.keyHash, scope.keyHash),
          gte(
            rateLimitEvents.requestedAt,
            new Date(now.getTime() - scope.windowMs),
          ),
        ),
      );
    }

    const recentEvents = await tx
      .select({
        keyHash: rateLimitEvents.keyHash,
        namespace: rateLimitEvents.namespace,
        requestedAt: rateLimitEvents.requestedAt,
        subject: rateLimitEvents.subject,
      })
      .from(rateLimitEvents)
      .where(or(...conditions));

    let retryAfter = 0;
    for (const rule of rules) {
      const cutoff = now.getTime() - rule.windowMs;
      const requests = recentEvents
        .filter(
          (event) =>
            event.namespace === rule.namespace &&
            event.subject === rule.subject &&
            event.keyHash === rule.keyHash &&
            event.requestedAt.getTime() >= cutoff,
        )
        .map(({ requestedAt }) => requestedAt.getTime())
        .sort((left, right) => left - right);

      if (requests.length < rule.max) {
        continue;
      }

      const releaseRequest = requests[requests.length - rule.max];
      const releaseSeconds = Math.max(
        1,
        Math.ceil((releaseRequest + rule.windowMs - now.getTime()) / 1000),
      );
      retryAfter = Math.max(retryAfter, releaseSeconds);
    }

    if (retryAfter > 0) {
      return { allowed: false, retryAfter };
    }

    const events = Array.from(
      scopes.values(),
      ({ keyHash, namespace, subject, windowMs }) => ({
        expiresAt: new Date(now.getTime() + windowMs),
        keyHash,
        namespace,
        requestedAt: now,
        subject,
      }),
    );
    await tx.insert(rateLimitEvents).values(events);

    return { allowed: true as const };
  });
}
