"use client";

import { useEffect, useState } from "react";
import startCase from "lodash-es/startCase";

import CheckboxList from "@kenstack/forms/CheckboxList";
import DateField from "@kenstack/forms/DateField";
import DateTimeField from "@kenstack/forms/DateTimeField";
import InputField from "@kenstack/forms/InputField";
import MarkdownField from "@kenstack/forms/MarkdownField";
import RadioButtonField from "@kenstack/forms/RadioButtonField";
import SelectField from "@kenstack/forms/SelectField";
import SwitchField from "@kenstack/forms/SwitchField";
import TextareaField from "@kenstack/forms/TextareaField";
import type {
  DefinedField,
  DefinedFields,
  FieldComponent,
  FieldComponentProps,
} from "@kenstack/fields/types";

export default function FieldLayout({ fields }: { fields: DefinedFields }) {
  return Object.entries(fields).map(([name, field]) => (
    <FieldLayoutItem field={field} key={name} name={name} />
  ));
}

function FieldLayoutItem({
  field,
  name,
}: {
  field: DefinedField;
  name: string;
}) {
  const label = field.label || startCase(name);
  const props = {
    description: field.description,
    label,
    name,
    options: field.options,
  } satisfies FieldComponentProps;

  if (field.component) {
    return <DynamicField component={field.component} {...props} />;
  }

  switch (field.kind) {
    case "text":
      return <InputField {...props} />;
    case "number":
      return <InputField {...props} type="number" />;
    case "email":
      return <InputField {...props} type="email" />;
    case "textarea":
      return <TextareaField {...props} />;
    case "markdown":
      return <MarkdownField {...props} />;
    case "boolean":
      return <SwitchField {...props} />;
    case "date":
      return <DateField {...props} />;
    case "datetime":
      return <DateTimeField {...props} />;
    case "select":
      return <SelectField {...props} options={field.options ?? []} />;
    case "radio-button":
      return <RadioButtonField {...props} options={field.options ?? []} />;
    case "checkbox-list":
      return (
        <CheckboxList
          {...props}
          options={
            field.options?.map(({ label, value }) => ({ label, value })) ?? []
          }
        />
      );
    default:
      throw new Error(
        `Field layout item "${name}" needs a dynamic component for "${field.kind}" fields.`,
      );
  }
}

function DynamicField({
  component,
  ...props
}: FieldComponentProps & {
  component: NonNullable<DefinedField["component"]>;
}) {
  const [Component, setComponent] = useState<FieldComponent>();

  useEffect(() => {
    let cancelled = false;

    void component().then(({ default: loadedComponent }) => {
      if (!cancelled) {
        setComponent(() => loadedComponent);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [component]);

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
}
