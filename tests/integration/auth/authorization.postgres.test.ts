import { setTimeout as delay } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  token: "authorization-test-token" as string | undefined,
  revalidateTag: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.token ? { value: mocks.token } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@app/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@app/modules", async () => ({
  modules: {
    users: {
      admin: { table: (await import("@kenstack/modules/users/tables")).users },
    },
  },
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentSession: vi.fn(),
  sessionCacheTag: (hash: string) => `session:${hash}`,
}));
vi.mock("@kenstack/api", async () => await import("@kenstack/api/errors"));

import { db } from "@app/db";
import { sessions } from "@kenstack/db/tables/sessions";
import { extendAuthorization } from "@kenstack/auth/reauthentication/server";
import { hashToken } from "@kenstack/auth/server/token";
import { startTestPostgres } from "../postgres";

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let client: ReturnType<typeof postgres>;
const binding = { sessionId: 1 };

beforeAll(async () => {
  cluster = await startTestPostgres();
  client = postgres({ ...cluster.connection, max: 5, prepare: false });
  const database = drizzle(client);
  mocks.transaction.mockImplementation(database.transaction.bind(database));
  await client.unsafe(`
    create table users (id integer primary key, deleted_at timestamptz);
    create table sessions (
      id integer primary key, user_id integer not null references users(id), token_hash varchar(64) not null,
      impersonated_by integer, authorized_until timestamptz not null, created_at timestamptz not null, expires_at timestamptz not null
    );
  `);
});

afterAll(async () => {
  try {
    await client?.end({ timeout: 5 });
  } finally {
    await cluster?.stop();
  }
});

beforeEach(async () => {
  mocks.token = "authorization-test-token";
  mocks.revalidateTag.mockClear();
  await client`truncate sessions, users`;
  await client`insert into users(id) values (1), (2)`;
  await client`insert into sessions(id,user_id,token_hash,authorized_until,created_at,expires_at)
    values (1,1,${hashToken(mocks.token)},clock_timestamp()+interval '1 minute',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day')`;
});

async function loadSession() {
  const [session] = await db.transaction((tx) =>
    tx
      .select({
        authorizedUntil: sessions.authorizedUntil,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, 1)),
  );
  return session;
}

it("caps the authorization grant at fixed login expiry", async () => {
  await client`update sessions set expires_at=clock_timestamp()+interval '2 minutes' where id=1`;
  const before = await loadSession();
  await db.transaction((tx) =>
    extendAuthorization(binding, tx, new Date(Date.now() + 600_000)),
  );
  const after = await loadSession();
  expect(after.authorizedUntil).toEqual(before.expiresAt);
  expect(after.expiresAt).toEqual(before.expiresAt);
});

it.each([0, -1, -30, -60])(
  "refuses expired authorization (%i seconds)",
  async (seconds) => {
    await client`update sessions set authorized_until=clock_timestamp()+${seconds}*interval '1 second' where id=1`;
    const before = await loadSession();
    await expect(
      db.transaction((tx) =>
        extendAuthorization(binding, tx, new Date(Date.now() + 600_000)),
      ),
    ).rejects.toMatchObject({
      code: "reauthentication-required",
    });
    expect(await loadSession()).toEqual(before);
  },
);

it.each([
  "missing-cookie",
  "wrong-token",
  "wrong-session",
  "impersonated",
  "deleted-user",
  "expired-session",
  "revoked",
])("refuses %s", async (scenario) => {
  let requested = binding;
  if (scenario === "missing-cookie") mocks.token = undefined;
  if (scenario === "wrong-token") mocks.token = "another-token";
  if (scenario === "wrong-session") requested = { ...binding, sessionId: 2 };
  if (scenario === "impersonated")
    await client`update sessions set impersonated_by=2 where id=1`;
  if (scenario === "deleted-user")
    await client`update users set deleted_at=clock_timestamp() where id=1`;
  if (scenario === "expired-session")
    await client`update sessions set expires_at=clock_timestamp()-interval '1 second' where id=1`;
  if (scenario === "revoked") await client`delete from sessions where id=1`;
  const before = await loadSession();
  await expect(
    db.transaction((tx) =>
      extendAuthorization(requested, tx, new Date(Date.now() + 600_000)),
    ),
  ).rejects.toMatchObject(
    scenario === "missing-cookie"
      ? { status: 401 }
      : { code: "reauthentication-required" },
  );
  expect(await loadSession()).toEqual(before);
});

it("grants through the explicit challenge expiry without shortening a newer grant", async () => {
  const expiresAt = new Date(Date.now() + 600_000);
  await db.transaction((tx) => extendAuthorization(binding, tx, expiresAt));
  expect((await loadSession()).authorizedUntil).toEqual(expiresAt);
  await db.transaction((tx) =>
    extendAuthorization(binding, tx, new Date(expiresAt.getTime() - 60_000)),
  );
  expect((await loadSession()).authorizedUntil).toEqual(expiresAt);
});

it("rolls a challenge grant back when its owning transaction fails", async () => {
  const before = await loadSession();
  await expect(
    db.transaction(async (tx) => {
      await extendAuthorization(binding, tx, new Date(Date.now() + 600_000));
      throw new Error("challenge creation failed");
    }),
  ).rejects.toThrow("challenge creation failed");
  expect(await loadSession()).toEqual(before);
});

it("preserves the longest grant across concurrent requests", async () => {
  const deadlines = [500_000, 300_000, 600_000, 400_000].map(
    (ms) => new Date(Date.now() + ms),
  );
  await Promise.all(
    deadlines.map((expiresAt) =>
      db.transaction((tx) => extendAuthorization(binding, tx, expiresAt)),
    ),
  );
  expect((await loadSession()).authorizedUntil.getTime()).toBe(
    Math.max(...deadlines.map((date) => date.getTime())),
  );
});

it("refuses a session that expires while renewal waits for an unchanged row lock", async () => {
  await client`update sessions set authorized_until=clock_timestamp()+interval '2 seconds' where id=1`;
  const before = await loadSession();
  const locked = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const holder = db.transaction(async (tx) => {
    await tx.execute(sql`select id from sessions where id=1 for update`);
    locked.resolve();
    await release.promise;
  });
  await locked.promise;
  const renewal = db.transaction((tx) =>
    extendAuthorization(binding, tx, new Date(Date.now() + 600_000)),
  );
  const refusal = expect(renewal).rejects.toMatchObject({
    code: "reauthentication-required",
  });
  try {
    await vi.waitFor(
      async () => {
        const [waiting] = await client<{ waiting: boolean }[]>`
        select exists(select 1 from pg_stat_activity where datname=current_database() and wait_event_type='Lock') as waiting`;
        expect(waiting.waiting).toBe(true);
      },
      { interval: 20, timeout: 500 },
    );
    await delay(
      Math.max(0, before.authorizedUntil.getTime() - Date.now() + 20),
    );
  } finally {
    release.resolve();
    await holder;
  }
  await refusal;
  expect(await loadSession()).toEqual(before);
  expect(before.authorizedUntil.getTime()).toBeLessThan(Date.now());
});
