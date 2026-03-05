import postgres from "postgres";
import { type FetchError } from "@kenstack/lib/fetcher";

const uniqueConstraintMessages: Record<string, [string, string]> = {
  users_email_unique_active: [
    "email",
    "An account with this email already exists.",
  ],
};

function isPostgresError(err: unknown): err is postgres.PostgresError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "constraint_name" in err // This ensures it's specifically the postgres.js driver
  );
}

export const createDbEerrorTranslator =
  () =>
  (err: unknown): FetchError | undefined => {
    if (
      typeof err !== "object" ||
      err === null ||
      !("cause" in err) ||
      !isPostgresError(err.cause)
    ) {
      return;
    }

    const { cause } = err;

    if (cause.code === "23505") {
      const { constraint_name: constraint } = cause;
      if (constraint && uniqueConstraintMessages[constraint]) {
        const [fieldName, message] = uniqueConstraintMessages[constraint];
        return {
          status: "error",
          message:
            "We couldn't conplete your request. See the highlighted field below for more information.",
          fieldErrors: { [fieldName]: [message] },
        };
      } else {
        return {
          status: "error",
          message: "We couldn't complete your request. " + cause.detail,
        };
      }
    }
  };
