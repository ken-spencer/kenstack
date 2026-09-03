import { describe, expect, it } from "vitest";
import * as z from "zod";

import { defineClient, defineOneToOneClient } from "@kenstack/admin/client";
import { defineFormFields } from "@kenstack/fields/formFields";
import { defineFields } from "@kenstack/admin/fields";
import {
  booleanField,
  checkboxListField,
  comboboxField,
  configurable,
  field,
  fileField,
  imageField,
  numberField,
  radioButtonField,
  relationshipField,
  selectField,
  textField,
  urlField,
} from "@kenstack/fields";
import CheckboxList from "@kenstack/forms/CheckboxList";
import ComboboxField from "@kenstack/forms/ComboboxField";
import RadioButtonField from "@kenstack/forms/RadioButtonField";
import SelectField from "@kenstack/forms/SelectField";
import UrlField from "@kenstack/forms/UrlField";

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
const relatedFields = defineFields({
  fields: {
    related: field({
      default: "",
      kind: "related-client-value",
      zod: z.string(),
    }),
  },
});
const clientOneToOne = {
  details: defineOneToOneClient({ fields: relatedFields, EditForm: Component }),
};
const relatedField = relatedFields.related;

describe("form field generation", () => {
  it("keeps generated components separate from defineClient fields", () => {
    const FieldComponent = () => null;
    const formFields = defineFormFields(fields, {
      components: { value: FieldComponent },
    });
    const client = defineClient({
      admin: {
        fields,
        EditForm: Component,
        oneToOne: clientOneToOne,
      },
    });

    expect(Object.keys(formFields)).toEqual(["title", "value"]);
    expect(client.admin?.fields.title).toBe(fields.title);
    expect(client.admin?.fields).toHaveProperty(
      "kind",
      client.admin?.oneToOne?.selectionField,
    );
    expect("component" in client.admin!.fields.title).toBe(false);
    expect("component" in client.admin!.fields.value).toBe(false);
    expect("component" in fields.value).toBe(false);
  });

  it("passes bare one-to-one fields to relation forms", () => {
    const client = defineClient({
      admin: {
        fields,
        EditForm: Component,
        oneToOne: clientOneToOne,
      },
    });

    const clientRelatedFields =
      client.admin!.oneToOne!.relations.details.fields;
    expect(clientRelatedFields.related).toBe(relatedField);
    expect("component" in clientRelatedFields.related).toBe(false);
  });

  it("generates fixed-name fields for module forms", () => {
    const formFields = defineFormFields(
      defineFields({ fields: { title: textField() } }),
    );

    expect(Object.keys(formFields)).toEqual(["title"]);
  });

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

    expect(category({}).props.label).toBe("Category");
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

  it("uses option controls directly with their configured options", () => {
    const options = [{ label: "Example", value: "example" }] as const;
    const generated = defineFormFields(
      defineFields({
        fields: {
          checkboxList: checkboxListField({ options }),
          combobox: comboboxField({ options }),
          radio: radioButtonField({ options }),
          select: selectField({ options }),
        },
      }),
    );
    const entries = [
      [generated.checkboxList, CheckboxList],
      [generated.combobox, ComboboxField],
      [generated.radio, RadioButtonField],
      [generated.select, SelectField],
    ] as const;

    for (const [GeneratedField, Component] of entries) {
      const element = (
        GeneratedField as unknown as (props: object) => {
          props: Record<string, unknown>;
          type: unknown;
        }
      )({});

      expect(element.type).toBe(Component);
      expect(element.props.options).toBe(options);
    }
  });

  it("uses the URL control for URL fields", () => {
    const generated = defineFormFields(
      defineFields({
        fields: {
          external: urlField(),
        },
      }),
    );
    const external = generated.external as unknown as (props: object) => {
      type: unknown;
    };

    expect(external({}).type).toBe(UrlField);
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
    ).toThrowError(
      'Unknown client field registration "typo". No configured field uses that name.',
    );

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

  it("keeps settings form components separate from bare settings fields", () => {
    const settingsFields = defineFields({ fields: { title: textField() } });
    const client = defineClient({
      settings: {
        fields: settingsFields,
        SettingsForm: Component,
      },
    });

    expect(client.settings?.fields).toBe(settingsFields);
    expect(client.settings?.SettingsForm).toBe(Component);
    expect("component" in client.settings!.fields.title).toBe(false);
  });

  it("allows a settings form to own fields without registered components", () => {
    const settingsFields = defineFields({
      fields: { custom: field({ default: "", zod: z.string() }) },
    });
    const client = defineClient({
      settings: {
        fields: settingsFields,
        SettingsForm: Component,
      },
    });

    expect(client.settings?.fields.custom).toBe(settingsFields.custom);
  });
});
