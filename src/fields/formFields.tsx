"use client";

/*
 * Public entry point: the client-side form-field API for host applications.
 * Importing this entry point includes Kenstack's built-in admin field editors.
 */

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { createElement } from "react";
import startCase from "lodash-es/startCase";

import type { DefinedFields } from "@kenstack/admin/fields";
import FileField from "@kenstack/admin/forms/FileField";
import ImageField from "@kenstack/admin/forms/ImageField";
import MediaListField from "@kenstack/admin/forms/MediaListField";
import RelationshipField from "@kenstack/admin/forms/RelationshipField";
import TagField from "@kenstack/admin/forms/TagField";
import DateField from "@kenstack/fields/date/Component";
import { getConfiguredFormProps } from "@kenstack/fields/internal/formConfiguration";
import CheckboxList from "@kenstack/forms/CheckboxList";
import CheckboxField from "@kenstack/forms/CheckboxField";
import ComboboxField from "@kenstack/forms/ComboboxField";
import DateTimeField from "@kenstack/forms/DateTimeField";
import InputField from "@kenstack/forms/InputField";
import MarkdownField from "@kenstack/forms/MarkdownField";
import MoneyField from "@kenstack/forms/MoneyField";
import PhoneField from "@kenstack/forms/PhoneField";
import RadioButtonField from "@kenstack/forms/RadioButtonField";
import SelectField from "@kenstack/forms/SelectField";
import SlugField from "@kenstack/forms/SlugField";
import SwitchField from "@kenstack/forms/SwitchField";
import TextareaField from "@kenstack/forms/TextareaField";
import UrlField from "@kenstack/forms/UrlField";
import { hasKey } from "@kenstack/lib/hasKey";

export type FieldComponentProps = {
  name: string;
  label?: ReactNode;
  description?: ReactNode;
  help?: ReactNode;
  className?: string;
};

type FieldComponent = ComponentType<FieldComponentProps>;

type InputProps = Omit<
  ComponentProps<typeof InputField>,
  "onBlur" | "onChange" | "type"
>;

function TextInputField(props: InputProps) {
  return <InputField {...props} />;
}

function NumberInputField(props: InputProps) {
  return <InputField {...props} type="number" />;
}

function EmailInputField(props: InputProps) {
  return <InputField {...props} type="email" />;
}

function BooleanField(
  props: Omit<ComponentProps<typeof SwitchField>, "checked" | "unchecked">,
) {
  return <SwitchField {...props} />;
}

function NamedRelationshipField(
  props: Omit<ComponentProps<typeof RelationshipField>, "relationship">,
) {
  return <RelationshipField {...props} relationship={props.name} />;
}

const builtInFieldComponents = {
  text: TextInputField,
  number: NumberInputField,
  money: MoneyField,
  email: EmailInputField,
  textarea: TextareaField,
  markdown: MarkdownField,
  boolean: BooleanField,
  checkbox: CheckboxField,
  date: DateField,
  datetime: DateTimeField,
  select: SelectField,
  combobox: ComboboxField,
  "radio-button": RadioButtonField,
  "checkbox-list": CheckboxList,
  file: FileField,
  image: ImageField,
  "media-list": MediaListField,
  phone: PhoneField,
  relationship: NamedRelationshipField,
  tags: TagField,
  slug: SlugField,
  toggle: SwitchField,
  url: UrlField,
};

type FieldComponents<TFields extends DefinedFields> = Partial<
  Record<keyof TFields, FieldComponent>
>;

type ComponentFor<
  TFields extends DefinedFields,
  TName extends keyof TFields,
  TFieldComponents extends FieldComponents<TFields>,
> = TName extends keyof TFieldComponents
  ? NonNullable<TFieldComponents[TName]>
  : TFields[TName]["kind"] extends keyof typeof builtInFieldComponents
    ? (typeof builtInFieldComponents)[TFields[TName]["kind"]]
    : never;

type GeneratedFieldProps<
  TFields extends DefinedFields,
  TName extends keyof TFields,
  TFieldComponents extends FieldComponents<TFields>,
> = Omit<
  ComponentProps<ComponentFor<TFields, TName, TFieldComponents>>,
  "name" | "label" | keyof TFields[TName]
> & {
  namePrefix?: string;
};

type GeneratedFormFields<
  TFields extends DefinedFields,
  TFieldComponents extends FieldComponents<TFields>,
> = {
  [
    TName in keyof TFields as [
      ComponentFor<TFields, TName, TFieldComponents>,
    ] extends [never]
      ? never
      : TName
  ]: ComponentType<GeneratedFieldProps<TFields, TName, TFieldComponents>>;
};

export type FormFields<TFields extends DefinedFields> = GeneratedFormFields<
  TFields,
  Record<never, never>
>;

// Generates fixed-name controls once at module scope. The controls read form
// state through the standard form context rather than props or a provider.
export function defineFormFields<
  const TFields extends DefinedFields,
  const TFieldComponents extends FieldComponents<TFields> = Record<
    never,
    never
  >,
>(
  fields: TFields,
  options: {
    components?: TFieldComponents;
    prefix?: string;
  } = {},
): GeneratedFormFields<TFields, TFieldComponents> {
  const namedComponents = options.components;
  for (const name of Object.keys(namedComponents ?? {})) {
    if (!(name in fields)) {
      throw new Error(
        `Unknown client field registration "${name}". No configured field uses that name.`,
      );
    }
  }

  return Object.fromEntries(
    Object.entries(fields).flatMap(([name, field]) => {
      const Component =
        (namedComponents && hasKey(namedComponents, name)
          ? namedComponents[name]
          : undefined) ??
        (hasKey(builtInFieldComponents, field.kind)
          ? builtInFieldComponents[field.kind]
          : undefined);
      if (!Component) {
        return [];
      }

      const configuredProps = getConfiguredFormProps(field);
      const configuredFieldName = options.prefix
        ? `${options.prefix}.${name}`
        : name;

      function GeneratedField({
        namePrefix,
        ...props
      }: Record<string, unknown> & { namePrefix?: string }) {
        const fieldName = namePrefix
          ? `${namePrefix}.${configuredFieldName}`
          : configuredFieldName;

        return createElement(
          Component as ComponentType<Record<string, unknown>>,
          {
            ...props,
            ...configuredProps,
            name: fieldName,
            label: configuredProps.label ?? startCase(name),
          },
        );
      }

      GeneratedField.displayName = `Field.${configuredFieldName}`;
      return [[name, GeneratedField]];
    }),
  ) as unknown as GeneratedFormFields<TFields, TFieldComponents>;
}
