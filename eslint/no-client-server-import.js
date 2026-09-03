const clientSafeServerPathExceptions = new Set([
  "@kenstack/api/errors",
  "@kenstack/api/fetcher",
  "@kenstack/db/tables/media/mimeTypes",
]);

const serverOnlyPrefixes = [
  "@app/db",
  "@app/email",
  "@app/modules",
  "@kenstack/admin/module",
  "@kenstack/admin/table",
  "@kenstack/auth/server",
  "@kenstack/db",
  "@kenstack/fields/server",
  "@kenstack/records",
  "drizzle-orm",
];

function isServerOnlyPath(source) {
  if (clientSafeServerPathExceptions.has(source)) {
    return false;
  }

  if (
    source === "server-only" ||
    source === "next/cache" ||
    source === "next/headers" ||
    source === "next/server" ||
    source.startsWith("node:") ||
    serverOnlyPrefixes.some(
      (prefix) => source === prefix || source.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  return source
    .split("/")
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..")
    .some(
      (segment) =>
        segment === "api" ||
        segment === "queries" ||
        segment === "server" ||
        segment === "tables",
    );
}

function isTypeOnlyImport(node) {
  return (
    node.importKind === "type" ||
    (node.specifiers.length > 0 &&
      node.specifiers.every((specifier) => specifier.importKind === "type"))
  );
}

function isTypeOnlyExport(node) {
  return (
    node.exportKind === "type" ||
    (node.type === "ExportNamedDeclaration" &&
      node.specifiers.length > 0 &&
      node.specifiers.every((specifier) => specifier.exportKind === "type"))
  );
}

function isClientProgram(program) {
  return program.body.some(
    (statement) =>
      statement.type === "ExpressionStatement" &&
      statement.directive === "use client",
  );
}

const noClientServerImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow runtime imports from server-owned modules in Client Components.",
    },
    messages: {
      serverImport:
        'Client Components cannot import server-owned module "{{source}}" at runtime. Move shared code to an isomorphic owner or use a type-only import.',
    },
    schema: [],
  },
  create(context) {
    let client = false;

    function reportSource(node, source) {
      if (client && isServerOnlyPath(source)) {
        context.report({
          data: { source },
          messageId: "serverImport",
          node,
        });
      }
    }

    return {
      Program(node) {
        client = isClientProgram(node);
      },
      ImportDeclaration(node) {
        if (!isTypeOnlyImport(node)) {
          reportSource(node.source, node.source.value);
        }
      },
      ImportExpression(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string"
        ) {
          reportSource(node.source, node.source.value);
        }
      },
      ExportAllDeclaration(node) {
        if (!isTypeOnlyExport(node)) {
          reportSource(node.source, node.source.value);
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source && !isTypeOnlyExport(node)) {
          reportSource(node.source, node.source.value);
        }
      },
    };
  },
};

export default noClientServerImport;
