import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  deps: {
    db: undefined as unknown,
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: mocks.deps, tables: {} }));
vi.mock("@vercel/functions", () => ({
  ipAddress: () => "203.0.113.7",
  waitUntil: () => {},
}));
vi.mock("@kenstack/lib/errorLog", () => ({
  default: vi.fn(async () => {}),
}));

import rateLimitEmailRequest, {
  rateLimitIpRequest,
} from "@kenstack/api/rateLimit";
import { startTestPostgres } from "../postgres";

const request = {} as NextRequest;

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let database: PostgresJsDatabase;
let sqlClient: ReturnType<typeof postgres>;

beforeAll(async () => {
  cluster = await startTestPostgres();
  sqlClient = postgres({
    ...cluster.connection,
    max: 6,
    prepare: false,
  });
  database = drizzle(sqlClient);
  mocks.deps.db = database;

  await sqlClient.unsafe(`
    create table rate_limit_events (
      id integer generated always as identity primary key,
      namespace text not null,
      subject text not null,
      key_hash text not null,
      requested_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `);
});

beforeEach(async () => {
  await sqlClient.unsafe("truncate rate_limit_events restart identity");
});

afterAll(async () => {
  try {
    await sqlClient?.end({ timeout: 5 });
  } finally {
    await cluster?.stop();
  }
});

describe("rate limiter PostgreSQL boundary", () => {
  it("exhausts a sequential quota and reports a bounded Retry-After", async () => {
    const claim = () =>
      rateLimitIpRequest({
        limits: [{ max: 2, within: "15 minutes" }],
        name: "integration-sequential",
        request,
      });

    await expect(claim()).resolves.toEqual({ allowed: true });
    await expect(claim()).resolves.toEqual({ allowed: true });

    const rejected = await claim();
    expect(rejected.allowed).toBe(false);
    if (rejected.allowed) {
      throw new Error("Expected the third claim to be rejected.");
    }
    expect(rejected.retryAfter).toBeGreaterThanOrEqual(1);
    expect(rejected.retryAfter).toBeLessThanOrEqual(15 * 60);
  });

  it("never exceeds the quota under concurrent claims", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        rateLimitIpRequest({
          limits: [{ max: 3, within: "1 hour" }],
          name: "integration-concurrent",
          request,
        }),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => !result.allowed)).toHaveLength(3);
    const [{ count }] = await sqlClient<
      [{ count: string }]
    >`select count(*) as count from rate_limit_events`;
    expect(Number(count)).toBe(3);
  });

  it("enforces the shared email quota across independent workflows", async () => {
    const claim = (name: string) =>
      rateLimitEmailRequest({
        email: "Person@Example.com",
        limits: { email: [{ max: 1, within: "15 minutes" }] },
        name,
        request,
      });

    for (let index = 0; index < 12; index += 1) {
      await expect(claim(`integration-email-${index}`)).resolves.toEqual({
        allowed: true,
      });
    }

    const rejected = await claim("integration-email-overall-limit");
    expect(rejected.allowed).toBe(false);
    if (rejected.allowed) {
      throw new Error("Expected the shared email quota to reject the claim.");
    }
    expect(rejected.retryAfter).toBeGreaterThanOrEqual(1);
    expect(rejected.retryAfter).toBeLessThanOrEqual(60 * 60);
  });
});
