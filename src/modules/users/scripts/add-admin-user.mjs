import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const env = { ...process.env };
env.NODE_OPTIONS = [env.NODE_OPTIONS, "--conditions=react-server"]
  .filter(Boolean)
  .join(" ");

const scriptPath = fileURLToPath(new URL("./add-admin-user.ts", import.meta.url));

const child = spawn(
  process.platform === "win32" ? "tsx.cmd" : "tsx",
  [
    "--tsconfig",
    "tsconfig.json",
    scriptPath,
    ...process.argv.slice(2),
  ],
  {
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
