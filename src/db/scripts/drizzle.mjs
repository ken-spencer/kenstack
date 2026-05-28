import { spawn } from "node:child_process";
import { join } from "node:path";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  process.stderr.write(
    "Usage: node kenstack/src/db/scripts/drizzle.mjs <generate|migrate> [...args]\n",
  );
  process.exit(1);
}

const bin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit",
);

const env = { ...process.env };

if (command === "migrate") {
  env.PGOPTIONS = [env.PGOPTIONS, "-c client_min_messages=warning"]
    .filter(Boolean)
    .join(" ");
}

const child = spawn(bin, [command, "--config=drizzle.config.ts", ...args], {
  env,
  stdio: ["inherit", "pipe", "pipe"],
});

const filterOutput = (stream) => {
  let buffer = "";
  let blockLines = null;
  let blockPrefix = "";
  let blockIsNotice = false;

  const writeLine = (line) => {
    if (
      line.startsWith("Reading config file ") ||
      line.startsWith("No config path provided, ")
    ) {
      return;
    }

    process.stdout.write(`${line}\n`);
  };

  const flushBlock = () => {
    if (!blockLines) {
      return;
    }

    if (!blockIsNotice) {
      blockLines.forEach((line, index) => {
        process.stdout.write(`${index === 0 ? blockPrefix : ""}${line}\n`);
      });
    }

    blockLines = null;
    blockPrefix = "";
    blockIsNotice = false;
  };

  const filterLine = (line) => {
    if (blockLines) {
      blockLines.push(line);
      blockIsNotice =
        blockIsNotice ||
        line.includes("severity_local: 'NOTICE'") ||
        line.includes("severity: 'NOTICE'");

      if (line.trim() === "}") {
        flushBlock();
      }

      return;
    }

    const blockStart = line.lastIndexOf("{");

    if (blockStart !== -1 && line.slice(blockStart).trim() === "{") {
      blockPrefix = line.slice(0, blockStart);
      blockLines = ["{"];
      return;
    }

    writeLine(line);
  };

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      filterLine(line);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      filterLine(buffer);
      buffer = "";
    }

    if (blockLines) {
      flushBlock();
    }
  });
};

filterOutput(child.stdout);
filterOutput(child.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
