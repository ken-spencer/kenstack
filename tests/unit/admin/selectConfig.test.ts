import { describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields";

const notes = defineTable({
  name: "select_config_notes",
  columns: {
    author: text("author").notNull(),
    title: text("title").notNull(),
  },
});

const publishedNotes = defineTable({
  name: "select_config_published_notes",
  publish: true,
  columns: {
    author: text("author").notNull(),
    title: text("title").notNull(),
  },
});

const fields = defineFields({
  fields: {
    author: textField({ list: true }),
    title: textField(),
  },
});

describe("admin.select configuration", () => {
  it("rejects an alias that would replace a column the record already loads", () => {
    expect(() =>
      defineModule({
        name: "select-config-canonical",
        admin: { fields, list: {}, table: notes, select: { id: notes.author } },
      }),
    ).toThrow('admin.select for select_config_notes cannot use the key "id"');
    expect(() =>
      defineModule({
        name: "select-config-field",
        admin: {
          fields,
          list: {},
          table: notes,
          select: { title: notes.author },
        },
      }),
    ).toThrow('cannot use the key "title"');
  });

  it("rejects a list alias on a column the list already selects", () => {
    expect(() =>
      defineModule({
        name: "select-config-list-canonical",
        admin: {
          fields,
          list: { select: { createdAt: notes.title } },
          table: notes,
        },
      }),
    ).toThrow(
      'admin.list.select for select_config_notes cannot use the key "createdAt"',
    );
    expect(() =>
      defineModule({
        name: "select-config-list-column",
        admin: {
          fields,
          list: { select: { author: notes.title } },
          table: notes,
        },
      }),
    ).toThrow('cannot use the key "author"');
  });

  it("rejects a list alias on the visibility column the list always selects", () => {
    expect(() =>
      defineModule({
        name: "select-config-list-visibility",
        admin: {
          fields,
          list: { select: { visibility: publishedNotes.title } },
          table: publishedNotes,
        },
      }),
    ).toThrow('cannot use the key "visibility"');
  });

  it("rejects a list alias on the fallback title column", () => {
    expect(() =>
      defineModule({
        name: "select-config-list-fallback",
        admin: {
          fields: defineFields({ fields: { title: textField() } }),
          list: { select: { title: notes.author } },
          table: notes,
        },
      }),
    ).toThrow('cannot use the key "title"');
  });

  it("accepts a list alias for a field that is not a list column", () => {
    expect(() =>
      defineModule({
        name: "select-config-list-extra",
        admin: {
          fields,
          list: { select: { title: notes.title } },
          table: notes,
        },
      }),
    ).not.toThrow();
  });
});
