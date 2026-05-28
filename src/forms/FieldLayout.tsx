"use client";

import startCase from "lodash-es/startCase";

import type { DefinedFields } from "@kenstack/fields/types";

type FieldLayoutProps = {
  fields: DefinedFields;
};

export default function FieldLayout({ fields }: FieldLayoutProps) {
  return Object.entries(fields).map(([name, field]) => {
    if (!field.component) {
      throw new Error(
        `Field layout item "${name}" must use a field helper with a component.`,
      );
    }

    const Component = field.component;
    const label = field.label || startCase(name);

    return (
      <Component
        key={name}
        name={name}
        label={label}
        description={field.description}
        options={field.options}
      />
    );
  });
}
