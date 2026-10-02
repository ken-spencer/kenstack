import "server-only";

import { and, getTableName, isNull, sql } from "drizzle-orm";

import { db } from "@app/db";
import { ReturnedError } from "@kenstack/api";
import {
  verificationEndedCode,
  verificationReplacedMessage,
} from "@kenstack/auth/email/verification/internal/policy";
import {
  saveModuleRecord,
  saveModuleRecordAs,
} from "@kenstack/admin/queries/save";
import { redeemEmailProof } from "@kenstack/auth/email/login/redeemProof";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";
import type { User } from "@kenstack/types";

import { getUsersModule } from "./getUsersModule";
import { loadLoginVerification } from "./state";
import { requireUser } from "./user";

// Thrown by the insert when the email already has an account, to roll the save back.
class AccountExistsError extends Error {}

// Creates the account for the email this browser has proven, with its details, then signs into it.
// The account and its details commit together or not at all, so the proof stays unredeemed until the
// save succeeds. Call it from a stage with access "proven"; the values are the stage's validated
// account fields, so its schema is the allowlist.
export async function createAccount(
  values: Partial<Pick<User, "familyName" | "givenName" | "middleName">> &
    Record<string, unknown>,
) {
  // Read afresh: another tab may have replaced or redeemed this proof since the stage checked it.
  const verification = await loadLoginVerification();
  if (!verification?.provenAt) {
    throw new ReturnedError(verificationReplacedMessage, {
      code: verificationEndedCode,
      status: 409,
    });
  }
  const usersModule = getUsersModule();
  const users = usersModule.admin.table;

  // The new account acts for its own save, so its id is reserved before the insert.
  const [{ id }] = await db.execute<{ id: number }>(
    sql`select nextval(pg_get_serial_sequence(${getTableName(users)}, 'id'))::int as id`,
  );
  const names = {
    email: verification.email,
    familyName: values.familyName ?? "",
    givenName: values.givenName ?? "",
    middleName: values.middleName ?? "",
  };

  const accountValues = { ...values, email: verification.email };
  try {
    const saved = await saveModuleRecordAs(
      { module: usersModule, values: accountValues },
      {
        query: async ({ data, select, tx }) => {
          const [row] = await tx
            .insert(users)
            .overridingSystemValue()
            .values({ ...data, createdBy: id, id })
            .onConflictDoNothing()
            .returning(select);
          if (!row) {
            const [existing] = await tx
              .select({ id: users.id })
              .from(users)
              .where(
                and(
                  sql`lower(${users.email}) = ${verification.email}`,
                  isNull(users.deletedAt),
                ),
              )
              .limit(1);
            // Without a live account for the email, the conflict is on another unique users column in the
            // site's account fields, such as a slug.
            throw existing
              ? new AccountExistsError()
              : new Error("The new account conflicts with another account.");
          }
          return row;
        },
        user: {
          ...names,
          avatar: null,
          id,
          initials: formatUserInitials(names),
          name: formatUserName(names),
          roles: [],
        },
      },
    );
    if (saved.status === "error") {
      return saved;
    }
  } catch (error) {
    // A concurrent request created the account first: sign into it without touching its details.
    if (!(error instanceof AccountExistsError)) {
      throw error;
    }
  }

  await redeemEmailProof();
  return { status: "success" as const };
}

// Saves the signed-in user's own account fields. The values are the stage's validated fields, so its
// schema is the allowlist. `changes` names the fields the form changed; without it, every value saves.
export async function updateUser({
  changes,
  values,
}: {
  changes?: string[];
  values: Record<string, unknown>;
}) {
  return saveModuleRecord({
    changes,
    id: (await requireUser()).id,
    module: getUsersModule(),
    values,
  });
}
