import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// PostgreSQL on macOS refuses to start ("postmaster became multithreaded
// during startup") when the inherited locale is unset or invalid.
const env = { ...process.env, LC_ALL: "C" };

// Reserves an unused loopback port for the disposable PostgreSQL process.
async function findAvailablePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to reserve a PostgreSQL test port.");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

// Starts an isolated PostgreSQL cluster under the system temporary directory.
export async function startTestPostgres() {
  const root = await mkdtemp(join(tmpdir(), "kenstack-postgres-"));
  const data = join(root, "data");
  const log = join(root, "postgres.log");
  const socket = join(root, "socket");
  await mkdir(socket);
  let port = 0;

  try {
    port = await findAvailablePort();
    await execFileAsync(
      "initdb",
      [
        "-D",
        data,
        "--auth=trust",
        "--username=postgres",
        "--no-locale",
        "--encoding=UTF8",
      ],
      { env },
    );
    await execFileAsync(
      "pg_ctl",
      [
        "-D",
        data,
        "-l",
        log,
        "-o",
        `-F -h 127.0.0.1 -p ${port} -k ${socket}`,
        "-w",
        "start",
      ],
      { env },
    );
  } catch (error) {
    const serverLog = await readFile(log, "utf8").catch(() => "");
    await rm(root, { force: true, recursive: true });
    throw serverLog
      ? new Error(`${String(error)}\n\nPostgreSQL log:\n${serverLog}`, {
          cause: error,
        })
      : error;
  }

  return {
    connection: {
      database: "postgres",
      host: "127.0.0.1",
      port,
      username: "postgres",
    },
    async stop() {
      await execFileAsync("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
      await rm(root, { force: true, recursive: true });
    },
  };
}
