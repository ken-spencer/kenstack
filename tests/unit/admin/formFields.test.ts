import { describe, expect, it } from "vitest";
import * as z from "zod";

import { defineFormFields } from "@kenstack/fields/formFields";
import { defineFields } from "@kenstack/admin/fields";
import {
  booleanField,
  configurable,
  field,
  fileField,
  imageField,
  numberField,
  relationshipField,
  textField,
} from "@kenstack/fields";

const Component = () => null;
const fields = defineFields({
  fields: {
    title: textField(),
    value: field({
      default: "",
      kind: "client-value",
      zod: z.string(),
    }),
  },
});

describe("form field generation", () => {
  it("composes a runtime prefix for fields in repeated records", () => {
    const Name = () => null;
    const formFields = defineFormFields(
      defineFields({ fields: { title: textField() } }),
      { components: { title: Name }, prefix: "content" },
    );
    const title = formFields.title as unknown as (props: object) => {
      props: Record<string, unknown>;
    };

    expect(title({ namePrefix: "blocks.2" }).props.name).toBe(
      "blocks.2.content.title",
    );
  });

  it("keeps field-owned options out of generated render props", () => {
    const configuredFields = defineFields({
      fields: {
        document: fileField({
          accept: ["application/pdf"],
          placeholder: "Select a PDF.",
          uploadMaxSize: 1024,
          uploadMaxSizeMessage: "Too large.",
        }),
        image: imageField({ selectVariant: "original" }),
        stocked: booleanField(),
      },
    });
    const generated = defineFormFields(configuredFields);
    const document = generated.document as unknown as (props: object) => {
      props: Record<string, unknown>;
    };
    const image = generated.image as unknown as (props: object) => {
      props: Record<string, unknown>;
    };

    expect(document({}).props).toMatchObject({
      accept: ["application/pdf"],
      placeholder: "Select a PDF.",
    });
    expect(document({}).props).not.toHaveProperty("uploadMaxSize");
    expect(document({}).props).not.toHaveProperty("uploadMaxSizeMessage");
    expect(image({}).props).not.toHaveProperty("selectVariant");
  });

  it("keeps configured editor props authoritative", () => {
    const generated = defineFormFields(
      defineFields({
        fields: {
          category: relationshipField({ mode: "single" }),
          quantity: numberField({
            description: "Configured description",
            label: "Quantity",
            min: 1,
            step: 1,
          }),
        },
      }),
    );
    const category = generated.category as unknown as (props: object) => {
      props: Record<string, unknown>;
    };
    const quantity = generated.quantity as unknown as (props: object) => {
      props: Record<string, unknown>;
    };

    expect(category({ mode: "multiple" }).props.mode).toBe("single");
    expect(
      quantity({
        description: "Local description",
        label: null,
        min: 10,
        step: 5,
      }).props,
    ).toMatchObject({
      description: "Configured description",
      label: "Quantity",
      min: 1,
      step: 1,
    });
  });

  it("captures editor props on concrete field definitions", () => {
    const editorConfiguration = configurable<{ tone?: string }>("tone");
    const generated = defineFormFields(
      defineFields({
        fields: {
          summary: field({
            ...editorConfiguration,
            default: "",
            kind: "client-value",
            tone: "warm",
            zod: z.string(),
          }),
        },
      }),
      { components: { summary: Component } },
    );
    const summary = generated.summary as unknown as (props: object) => {
      props: Record<string, unknown>;
    };

    expect(summary({ tone: "cool" }).props.tone).toBe("warm");
  });

  it("allows a named component to override a built-in component", () => {
    const FieldComponent = () => null;
    const formFields = defineFormFields(
      defineFields({ fields: { title: textField() } }),
      {
        components: { title: FieldComponent },
      },
    );
    const title = formFields.title as unknown as (props: object) => {
      type: unknown;
    };

    expect(title({}).type).toBe(FieldComponent);
  });

  it("stitches an unnamed one-off field by property", () => {
    const oneOffFields = defineFields({
      fields: { summary: field({ default: "", zod: z.string() }) },
    });
    const formFields = defineFormFields(oneOffFields, {
      components: { summary: Component },
    });
    const summary = formFields.summary as unknown as (props: object) => {
      props: Record<string, unknown>;
      type: unknown;
    };

    expect(summary({})).toMatchObject({
      props: { name: "summary" },
      type: Component,
    });
  });

  it("rejects unknown component registrations", () => {
    expect(() =>
      defineFormFields(fields, {
        components: { typo: Component } as never,
      }),
    ).toThrowError();

    const partialFields = defineFormFields(
      defineFields({
        fields: {
          summary: field({ default: "", zod: z.string() }),
          title: textField(),
        },
      }),
    );
    expect(Object.keys(partialFields)).toEqual(["title"]);
  });
});
