#!/usr/bin/env node

// Final-review bundle report. Metric composition is fixed as:
// buildManifest.rootMainFiles + route clientModules[*].chunks +
// route entryCSSFiles[*].path, de-duped by resolved file path, gzip level 9.
// Manifest chunk paths may be URL encoded; resolve direct paths first, then
// retry with decodeURIComponent for local filesystem inspection.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

const siteRoot = process.cwd();
const nextDir = path.join(siteRoot, ".next");
const sentinels = [
  "Drag to reorder",
  "useAdminList must be used within an AdminListProvider",
  "Admin client config is required for admin list routes.",
];

if (
  process.argv.some(
    (arg) =>
      arg !== process.argv[0] && arg !== process.argv[1] && arg !== "--report",
  )
) {
  // eslint-disable-next-line no-console -- Permanent CLI usage output.
  console.error("Usage: npm run bundle:report");
  process.exit(1);
}

try {
  // eslint-disable-next-line no-console -- Permanent CLI report output.
  console.log(createReportLines().join("\n"));
} catch (error) {
  // eslint-disable-next-line no-console -- Permanent CLI failure output.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function createReportLines() {
  const appPathRoutes = readJson(
    path.join(nextDir, "app-path-routes-manifest.json"),
  );
  const buildManifest = readJson(path.join(nextDir, "build-manifest.json"));
  const publicRouteKeys = Object.keys(appPathRoutes)
    .filter((routeKey) => routeKey.startsWith("/(site)/"))
    .filter((routeKey) => routeKey.endsWith("/page"))
    .sort((a, b) => appPathRoutes[a].localeCompare(appPathRoutes[b]));
  const controlRouteKeys = ["/admin/page", "/admin/[...admin]/page"].filter(
    (routeKey) => Object.hasOwn(appPathRoutes, routeKey),
  );

  if (publicRouteKeys.length === 0) {
    throw new Error(
      "No public app routes found. Run `npm run build` first and verify app-path-routes-manifest.json.",
    );
  }

  const lines = [
    "Bundle report",
    "Metric: rootMainFiles + route client chunks + route CSS, de-duped, gzip level 9",
    "Sentinels: " + sentinels.map((value) => JSON.stringify(value)).join(", "),
    "",
  ];
  appendSection(
    lines,
    "Public routes",
    publicRouteKeys,
    appPathRoutes,
    buildManifest,
  );
  lines.push("");
  appendSection(
    lines,
    "Control routes",
    controlRouteKeys,
    appPathRoutes,
    buildManifest,
  );
  return lines;
}

function appendSection(lines, title, routeKeys, appPathRoutes, buildManifest) {
  lines.push(title);

  for (const routeKey of routeKeys) {
    const routeUrl = appPathRoutes[routeKey];
    const routeFiles = getRouteFiles(routeKey, buildManifest);
    const gzipBytes = routeFiles.reduce((total, file) => {
      return total + gzipFile(file.resolvedPath);
    }, 0);
    const hits = getSentinelHits(routeFiles);

    lines.push(
      `- ${routeKey} (${routeUrl}): ${formatBytes(gzipBytes)} gzip, ${routeFiles.length} files`,
    );

    if (hits.length === 0) {
      lines.push("  sentinels: none");
      continue;
    }

    lines.push("  sentinels:");
    for (const hit of hits) {
      lines.push(`    ${JSON.stringify(hit.sentinel)} in ${hit.displayPath}`);
    }
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run \`npm run build\` first.`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getRouteFiles(routeKey, buildManifest) {
  const manifest = readRouteClientReferenceManifest(routeKey);
  const files = new Map();

  for (const filePath of buildManifest.rootMainFiles ?? []) {
    addFile(files, filePath);
  }

  for (const clientModule of Object.values(manifest.clientModules ?? {})) {
    for (const chunk of clientModule.chunks ?? []) {
      if (typeof chunk === "string" && isAssetPath(chunk)) {
        addFile(files, chunk);
      }
    }
  }

  for (const entries of Object.values(manifest.entryCSSFiles ?? {})) {
    for (const entry of entries ?? []) {
      if (typeof entry?.path === "string") {
        addFile(files, entry.path);
      }
    }
  }

  return [...files.values()].sort((a, b) =>
    a.displayPath.localeCompare(b.displayPath),
  );
}

function readRouteClientReferenceManifest(routeKey) {
  const manifestPath =
    path.join(nextDir, "server/app", routeKey.replace(/^\//, "")) +
    "_client-reference-manifest.js";

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing ${manifestPath}. Run \`npm run build\` first.`);
  }

  const source = fs.readFileSync(manifestPath, "utf8");
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox, { filename: manifestPath });

  const manifest = sandbox.globalThis.__RSC_MANIFEST?.[routeKey];
  if (!manifest) {
    throw new Error(`Could not read RSC manifest for ${routeKey}.`);
  }

  return manifest;
}

function addFile(files, filePath) {
  const resolvedPath = resolveNextFile(filePath);
  files.set(resolvedPath, {
    displayPath: path.relative(siteRoot, resolvedPath),
    resolvedPath,
  });
}

function resolveNextFile(filePath) {
  const directPath = path.join(nextDir, filePath);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const decodedPath = path.join(nextDir, decodeURIComponent(filePath));
  if (fs.existsSync(decodedPath)) {
    return decodedPath;
  }

  throw new Error(`Missing bundle file ${filePath}.`);
}

function isAssetPath(value) {
  return value.endsWith(".js") || value.endsWith(".css");
}

function gzipFile(filePath) {
  return zlib.gzipSync(fs.readFileSync(filePath), { level: 9 }).length;
}

function getSentinelHits(routeFiles) {
  const hits = [];

  for (const file of routeFiles) {
    const source = fs.readFileSync(file.resolvedPath, "utf8");

    for (const sentinel of sentinels) {
      if (source.includes(sentinel)) {
        hits.push({
          displayPath: file.displayPath,
          sentinel,
        });
      }
    }
  }

  return hits;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
