/* Public entry point: database setup runner for host migration scripts. */
import postgres from "postgres";

export type DatabaseSetupSql = postgres.Sql;
export type DatabaseInstaller = (sql: DatabaseSetupSql) => Promise<void>;

export async function runDatabaseSetup({
  connectionString,
  installers,
}: {
  connectionString: string | undefined;
  installers: DatabaseInstaller[];
}) {
  if (!connectionString) {
    throw new Error("DATABASE_URL or DATABASE_POOL_URL is required");
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  try {
    for (const install of installers) {
      await install(sql);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
