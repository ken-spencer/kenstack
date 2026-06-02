#!/usr/bin/env node

import bcrypt from "bcrypt";
import { config as dotenvConfig } from "dotenv";
import { and, eq, isNull, sql as sqlFragment } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import * as z from "zod";
import { users } from "@kenstack/modules/users/tables";
import { password as passwordSchema } from "@kenstack/zod/password";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Email address is invalid");

const helpText = `Usage: npm run users:add-admin

Interactively creates an admin user if the email is not already active.
Loads DATABASE_POOL_URL or DATABASE_URL from the environment, .env.local, or .env.
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(helpText);
  process.exit(0);
}

loadEnv();

const connectionString =
  process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  process.stderr.write(
    "DATABASE_POOL_URL or DATABASE_URL is required. Set it in your environment, .env.local, or .env.\n",
  );
  process.exit(1);
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write("This script must be run in an interactive terminal.\n");
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});
const db = drizzle(sql, { schema: { users } });

try {
  await createAdminUser();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unable to create admin user."}\n`,
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

function loadEnv() {
  const siteRoot = resolveSiteRoot();

  dotenvConfig({ path: resolve(siteRoot, ".env.local"), quiet: true });
  dotenvConfig({ path: resolve(siteRoot, ".env"), quiet: true });
}

function resolveSiteRoot() {
  const cwd = process.cwd();

  if (existsSync(resolve(cwd, "src", "tables.ts"))) {
    return cwd;
  }

  const parent = resolve(cwd, "..");

  if (existsSync(resolve(parent, "src", "tables.ts"))) {
    return parent;
  }

  return cwd;
}

async function createAdminUser() {
  process.stdout.write("Please enter your information below.\n\n");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let email: string;
  let givenName: string;
  let familyName: string;

  try {
    email = await askEmail(rl);

    const existingUser = await findActiveUserByEmail(email);

    if (existingUser) {
      process.stdout.write(
        `Active user already exists for ${existingUser.email} (id ${existingUser.id}). No changes made.\n`,
      );
      return;
    }

    givenName = await askRequired(rl, "Given name: ");
    familyName = await askRequired(rl, "Last name: ");
  } finally {
    rl.close();
  }

  const password = await askPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const insertedUser = await insertAdminUser({
    email,
    givenName,
    familyName,
    passwordHash,
  });

  process.stdout.write(
    `Created admin user ${insertedUser.email} (id ${insertedUser.id}).\n`,
  );
}

async function askEmail(
  rl: ReturnType<typeof createInterface>,
): Promise<string> {
  while (true) {
    const result = emailSchema.safeParse(await rl.question("Email: "));

    if (result.success) {
      return result.data;
    }

    process.stderr.write(`${formatSchemaError(result.error)}\n`);
  }
}

async function askRequired(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
) {
  while (true) {
    const value = (await rl.question(prompt)).trim();

    if (value) {
      return value;
    }

    process.stderr.write("This field is required.\n");
  }
}

async function askPassword() {
  while (true) {
    const password = await readHidden("Password: ");
    const result = passwordSchema.safeParse(password);

    if (!password.trim()) {
      process.stderr.write("Password is required.\n");
      continue;
    }

    if (!result.success) {
      process.stderr.write(`${formatSchemaError(result.error)}\n`);
      continue;
    }

    const confirmation = await readHidden("Confirm password: ");
    const confirmationResult = passwordSchema.safeParse(confirmation);

    if (
      !confirmationResult.success ||
      confirmationResult.data !== result.data
    ) {
      process.stderr.write("Passwords do not match.\n");
      continue;
    }

    return result.data;
  }
}

function readHidden(prompt: string) {
  process.stdout.write(prompt);

  return new Promise<string>((resolvePassword) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = "";

    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };

    const onKeypress = (
      chunk: string,
      key: { name?: string; ctrl?: boolean },
    ) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.stdout.write("\n");
        process.exit(130);
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        process.stdout.write("\n");
        resolvePassword(value);
        return;
      }

      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }

      if (!key.ctrl && chunk) {
        value += chunk;
      }
    };

    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("keypress", onKeypress);
  });
}

async function findActiveUserByEmail(email: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(sqlFragment<string>`lower(${users.email})`, email),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return user;
}

async function insertAdminUser(values: {
  email: string;
  givenName: string;
  familyName: string;
  passwordHash: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      givenName: values.givenName,
      familyName: values.familyName,
      email: values.email,
      roles: ["admin"],
      passwordHash: values.passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  if (!user) {
    throw new Error("The user insert did not return a row.");
  }

  return user;
}

function formatSchemaError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid value.";
}
