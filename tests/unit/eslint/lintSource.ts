import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const kenstackRoot = fileURLToPath(new URL("../../..", import.meta.url));
const eslint = new ESLint({ cwd: kenstackRoot });

export async function lintSource(
  source: string,
  relativePath = "src/eslint-rule-probe.ts",
) {
  const [result] = await eslint.lintText(source, {
    filePath: path.join(kenstackRoot, relativePath),
  });

  return result.messages;
}
