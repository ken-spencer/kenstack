// export { type ConfigDeps, type Tables } from "./createConfig";

// import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
// import { type FetchError } from "@kenstack/lib/fetcher";

// packages/server/src/db/contracts.ts
// import type { AnyPgColumn } from "drizzle-orm/pg-core";

// export type StringColumn = AnyPgColumn<{ data: string }>;
// export type StringArrayColumn = AnyPgColumn<{ data: string[] }>;

// export type JsonValue =
//   | string
//   | number
//   | boolean
//   | null
//   | JsonValue[]
//   | { [key: string]: JsonValue };

// import { passwordResetRequests } from "@kenstack/db/schema/sessions";
// import { users } from "@kenstack/db/schema/users";
// import { auditLogs } from "@kenstack/db/schema/audit";

// export type SchemaMin = {
//   users: typeof users;
//   auditLogs: typeof auditLogs;
//   passwordResetRequests: typeof passwordResetRequests;
// };

// export type DbWithSchema<TSchema extends Record<string, unknown>> =
//   PostgresJsDatabase<TSchema>;

// export type Auth = {
//   login: (userId: number) => Promise<void>;
//   logout: () => Promise<void>;
//   getCurrentUser: () => Promise<User | undefined>;
//   requireUser: (options?: RequireUserOptions) => Promise<User>;
// };

// import { type User } from "@kenstack/types";
// type UserRoles = "member" | "admin" | "editor";

// export type Deps<TSchema extends SchemaMin = SchemaMin> = {
// db: DbWithSchema<TSchema>;
// DbErrorTranslator: (err: unknown) => FetchError | undefined;
// tables: TSchema;
// logger: {
//   audit: AuditLogger;
// };
// auth: Auth;

// export type Deps<TRoles extends string[]> = {
//   user: User;
//   roles: TRoles;
// };
