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

const mocks = vi.hoisted(() => ({
  database: undefined as unknown as Record<PropertyKey, unknown>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: new Proxy({}, { get: (_target, property) => mocks.database[property] }),
}));
vi.mock("@kenstack/lib/ip", () => ({ default: async () => undefined }));
vi.mock("@vercel/functions", () => ({
  waitUntil: () => {},
}));

import { checkQuota, claimQuota, consumeQuota } from "@kenstack/api/quota";
import { startTestPostgres } from "../postgres";

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
  mocks.database = database as unknown as Record<PropertyKey, unknown>;

  await sqlClient.unsafe(`
    create table quota_uses (
      id integer generated always as identity primary key,
      scope text not null,
      email text,
      ip text,
      created_at timestamptz not null default now()
    )
  `);
});

beforeEach(async () => {
  await sqlClient.unsafe("truncate quota_uses restart identity");
});

afterAll(async () => {
  try {
    await sqlClient?.end({ timeout: 5 });
  } finally {
    await cluster?.stop();
  }
});

describe("quota PostgreSQL boundary", () => {
  it("exhausts a sequential quota", async () => {
    const claim = () =>
      claimQuota("integration-sequential", {
        ip: "203.0.113.7",
        limits: { ip: [2, "15 minutes"] },
      });

    await expect(claim()).resolves.toBeNull();
    await expect(claim()).resolves.toBeNull();

    await expect(claim()).resolves.toMatchObject({ subject: "ip" });
  });

  it("never exceeds the quota under concurrent claims", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        claimQuota("integration-concurrent", {
          ip: "203.0.113.7",
          limits: { ip: [3, "1 hour"] },
        }),
      ),
    );

    expect(results.filter((exceeded) => exceeded === null)).toHaveLength(3);
    expect(results.filter((exceeded) => exceeded !== null)).toHaveLength(3);
    const [{ count }] = await sqlClient<
      [{ count: string }]
    >`select count(*) as count from quota_uses`;
    expect(Number(count)).toBe(3);
  });

  it("counts each scope separately and records one row per use", async () => {
    const claim = (scope: string) =>
      claimQuota(scope, {
        email: "person@example.com",
        ip: "203.0.113.7",
        limits: { email: [1, "1 hour"] },
      });

    await expect(claim("integration-a")).resolves.toBeNull();
    await expect(claim("integration-b")).resolves.toBeNull();
    await expect(claim("integration-a")).resolves.toMatchObject({
      subject: "email",
    });
    const [{ count }] = await sqlClient<
      [{ count: string }]
    >`select count(*) as count from quota_uses`;
    expect(Number(count)).toBe(2);
  });

  it("enforces the site-wide email limit across scopes", async () => {
    for (let index = 0; index < 30; index += 1) {
      await expect(
        claimQuota(`integration-site-${index}`, {
          email: "person@example.com",
        }),
      ).resolves.toBeNull();
    }

    await expect(
      claimQuota("integration-site-over-limit", {
        email: "person@example.com",
      }),
    ).resolves.toMatchObject({ subject: "email" });
  });

  it("checks password failures without counting successes", async () => {
    const check = () =>
      checkQuota("password-failure", {
        email: "person@example.com",
        ip: "203.0.113.7",
        limits: { email: [2, "15 minutes"] },
      });

    await expect(check()).resolves.toBeNull();
    await consumeQuota("password-failure", {
      email: "person@example.com",
      ip: "203.0.113.7",
    });
    await consumeQuota("password-failure", {
      email: "person@example.com",
      ip: "203.0.113.7",
    });

    await expect(check()).resolves.toMatchObject({ subject: "email" });
  });
});
