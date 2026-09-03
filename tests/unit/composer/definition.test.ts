import { describe, expect, it } from "vitest";
import * as z from "zod";

import { defineFields } from "@kenstack/admin/fields";
import {
  defineBlocks,
  definePage,
  definePages,
} from "@kenstack/composer/definition";
import { textField } from "@kenstack/fields";

const Component = () => null;
const fields = defineFields({
  fields: {
    title: textField({
      zod: z.string().trim().min(1, "Title is required"),
    }),
  },
});
const blocks = defineBlocks({
  text: {
    component: Component,
    edit: Component,
    fields,
    label: "Text",
  },
});

describe("Composer page definitions", () => {
  it("validates registered block fields and preserves flat block values", () => {
    const page = definePage("about", blocks);
    const block = {
      id: "5yh2zlr2zc05lw4",
      kind: "text",
      title: "  About us  ",
    };

    expect(page.schema.parse([block])).toEqual([
      { ...block, title: "About us" },
    ]);
    expect(
      page.schema.safeParse([{ ...block, title: " " }]).error?.issues[0],
    ).toMatchObject({ message: "Title is required", path: [0, "title"] });
  });

  it("keeps archived blocks without validating their content", () => {
    const page = definePage("about", blocks);
    const archived = {
      archived: true,
      id: "5yh2zlr2zc05lw4",
      kind: "text",
      title: " ",
    };

    expect(page.schema.parse([archived])).toEqual([archived]);
    expect(
      page.schema.safeParse([{ ...archived, archived: false }]).error
        ?.issues[0],
    ).toMatchObject({ path: [0, "title"] });
    expect(
      page.schema.safeParse([{ ...archived, kind: "missing" }]).error
        ?.issues[0],
    ).toMatchObject({ path: [0, "kind"] });
  });

  it("rejects unknown kinds and duplicate block IDs", () => {
    const page = definePage("about", blocks);
    const block = {
      id: "5yh2zlr2zc05lw4",
      kind: "text",
      title: "About us",
    };

    expect(
      page.schema.safeParse([{ ...block, kind: "missing" }]).error?.issues[0],
    ).toMatchObject({ path: [0, "kind"] });
    expect(
      page.schema.safeParse([block, block]).error?.issues[0],
    ).toMatchObject({
      message: "Block IDs must be unique within a page.",
      path: [1, "id"],
    });
  });

  it("reserves structural block properties", () => {
    const invalidFields = defineFields({
      fields: { version: textField() },
    });

    expect(() =>
      definePage(
        "about",
        defineBlocks({
          invalid: {
            component: Component,
            edit: Component,
            fields: invalidFields,
            label: "Invalid",
          },
        }),
      ),
    ).toThrowError(
      'Composer block "invalid" cannot define reserved field "version".',
    );
  });

  it("builds one page registry and rejects duplicate keys", () => {
    const about = definePage("about", blocks);

    expect(definePages([about]).about).toBe(about);
    expect(() => definePages([about, about])).toThrowError(
      'Composer page key "about" is registered twice.',
    );
  });
});
