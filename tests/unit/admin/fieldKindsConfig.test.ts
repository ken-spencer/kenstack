import { describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { integer, pgTable, PgDialect, text } from "drizzle-orm/pg-core";
import * as z from "zod";

vi.mock("server-only", () => ({}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineRelationship, defineTable } from "@kenstack/admin/table";
import {
  field,
  relationshipField as defineRelationshipField,
  textField,
} from "@kenstack/fields";
import {
  defineRelationships,
  relationshipName,
} from "@kenstack/fields/relationship/relationships";
import {
  relationshipField,
  resolveServerFields,
  serverField,
} from "@kenstack/fields/server";

const products = defineTable({
  name: "behavior_config_products",
  columns: {
    name: text("name").notNull(),
    stock: integer("stock").notNull(),
  },
});

const stockField = field({
  default: 0,
  kind: "stock-value",
  zod: z.number().int(),
});

const fields = defineFields({
  fields: {
    name: textField({ filter: true }),
    stock: stockField,
  },
});
describe("module field servers", () => {
  it("rejects registrations that do not match any declared field kind", () => {
    expect(() =>
      resolveServerFields(fields, {
        fieldKinds: [{ kind: "stock-typo" }] as never,
      }),
    ).toThrowError(
      'Unknown server field kind registration "stock-typo". No configured field uses that kind.',
    );
  });

  it("rejects field registrations for single relationships", () => {
    const relationshipFields = defineFields({
      fields: {
        categoryId: defineRelationshipField({ mode: "single" }),
      },
    });
    const registration = serverField(relationshipFields.categoryId, () => ({}));

    expect(() =>
      resolveServerFields(relationshipFields, {
        fields: { categoryId: registration } as never,
      }),
    ).toThrowError(
      'Single relationship field "categoryId" cannot have a server registration; it uses direct table-column persistence.',
    );
  });

  it("applies a kind registration to unwrapped field maps", () => {
    const moduleConfig = defineModule({
      name: "behavior-products",
      admin: {
        fields,
        fieldServers: {
          stock: serverField(stockField, () => ({
            preSave: async ({ value }) =>
              value < 0
                ? { status: "error", message: "Stock cannot be negative." }
                : { status: "success" },
          })),
        },
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.fields.stock?.preSave).toBeTypeOf("function");
    expect(moduleConfig.admin.fields.name?.preSave).toBeUndefined();
    // Fields without registrations still resolve their kind defaults.
    if (!("list" in moduleConfig.admin)) {
      throw new Error("Expected a list module.");
    }

    expect(moduleConfig.admin.list).toMatchObject({
      filters: {
        name: {
          field: products.name,
          kind: "text",
        },
      },
    });
    expect("fieldKinds" in moduleConfig).toBe(false);
  });

  it("registers custom fields by property", () => {
    const moduleConfig = defineModule({
      name: "kind-keyed-products",
      admin: {
        fields,
        fieldServers: {
          stock: serverField(stockField, () => ({
            load: async ({ tableId }) => tableId,
          })),
        },
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.fields.stock?.load).toBeTypeOf("function");
  });

  it("rejects duplicate kind registrations", () => {
    const registration = serverField(stockField, () => ({}));

    expect(() =>
      resolveServerFields(fields, {
        fieldKinds: [registration, registration],
      }),
    ).toThrowError('Duplicate server field kind registration "stock-value".');
  });

  it("lets field-specific server behavior override kind behavior", async () => {
    const resolvedFields = resolveServerFields(fields, {
      fieldKinds: [
        serverField(stockField, () => ({ load: async () => "kind" })),
      ],
      fields: {
        stock: serverField(fields.stock, () => ({
          load: async () => "field",
        })),
      },
    });

    await expect(
      resolvedFields.stock.load?.({
        db: {} as never,
        key: "stock",
        tableId: 1,
      }),
    ).resolves.toBe("field");
  });

  it("stitches unnamed one-off server behavior by property", async () => {
    const oneOffFields = defineFields({
      fields: { summary: field({ default: "", zod: z.string() }) },
    });
    const oneOffTable = defineTable({
      name: "one_off_behavior",
      columns: { summary: text().notNull() },
    });
    const moduleConfig = defineModule({
      name: "one-off-behavior",
      admin: {
        fields: oneOffFields,
        fieldServers: {
          summary: serverField(oneOffFields.summary, () => ({
            load: async () => "loaded",
          })),
        },
        table: oneOffTable,
        list: {},
      },
    });

    expect(moduleConfig.admin.fields.summary.kind).toBe("summary");
    await expect(
      moduleConfig.admin.fields.summary.load?.({
        db: {} as never,
        key: "summary",
        tableId: 1,
      }),
    ).resolves.toBe("loaded");
  });

  it("builds virtual relationship filters without resolving a table column", () => {
    const articles = Object.assign(
      defineTable({ name: "relationship_filter_articles", columns: {} }),
      { [relationshipName]: "article" as const },
    );
    const topics = Object.assign(
      defineTable({
        name: "relationship_filter_topics",
        columns: { name: text("name").notNull() },
      }),
      { [relationshipName]: "topic" as const },
    );
    const articleTopics = defineRelationship({
      name: "relationship_filter_article_topics",
      from: { name: "article", table: articles },
      to: { name: "topic", table: topics },
    });
    const relationships = defineRelationships({
      topics: { from: articles, through: articleTopics, to: topics },
    });
    const relationshipFields = defineFields({
      fields: {
        categoryId: defineRelationshipField({ mode: "single" }),
        topics: defineRelationshipField({ filter: true }),
      },
    });
    const moduleConfig = defineModule({
      name: "relationship-filter-articles",
      admin: {
        fields: relationshipFields,
        fieldServers: {
          topics: relationshipField(relationships.topics),
        },
        table: articles,
        list: {},
      },
    });

    if (
      !("list" in moduleConfig.admin) ||
      !("filters" in moduleConfig.admin.list)
    ) {
      throw new Error("Expected a list module.");
    }

    const filter = moduleConfig.admin.list.filters.topics;
    expect(filter).toMatchObject({ kind: "includes", options: [] });
    const query = new PgDialect().sqlToQuery(sql`${filter.field}`);
    expect(query.sql).toContain('from "relationship_filter_article_topics"');
    expect(query.sql).toContain('inner join "relationship_filter_topics"');
    expect(moduleConfig.admin.fields.categoryId).not.toHaveProperty(
      "relationship",
    );
    expect(moduleConfig.admin.fields.categoryId).not.toHaveProperty("save");
  });

  it("derives persistence keys from relationship column overrides", () => {
    const articles = Object.assign(
      defineTable({ name: "relationship_override_articles", columns: {} }),
      { [relationshipName]: "article" as const },
    );
    const topics = Object.assign(
      defineTable({ name: "relationship_override_topics", columns: {} }),
      { [relationshipName]: "topic" as const },
    );
    const through = pgTable("relationship_override_links", {
      articleReference: integer("article_reference").notNull(),
      topicReference: integer("topic_reference").notNull(),
      relationship: text("relationship").notNull(),
    });
    const relationship = defineRelationships({
      topics: {
        from: articles,
        fromColumn: through.articleReference,
        through,
        to: topics,
        toColumn: through.topicReference,
      },
    }).topics;

    expect(relationship.fromColumnKey).toBe("articleReference");
    expect(relationship.toColumnKey).toBe("topicReference");
    expect(() =>
      defineRelationships({
        topics: {
          from: articles,
          // @ts-expect-error Column overrides must belong to the through table.
          fromColumn: articles.id,
          through,
          to: topics,
          toColumn: through.topicReference,
        },
      }),
    ).toThrow(/fromColumn must belong to the through table/);
  });
});
