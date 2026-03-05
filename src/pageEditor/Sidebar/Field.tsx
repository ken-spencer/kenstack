import React, { useState } from "react";
import { Input } from "@kenstack/components/ui/input";
import { Textarea } from "@kenstack/components/ui/textarea";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@kenstack/components/ui/field";
import { usePageEditor } from "../context";

import { Name } from "../types";
type Props = {
  name: Name;
  type?: "text" | "textarea";
  label: string;
  description?: string;
  placeholder?: string;
};

export default function SidebarField({
  name,
  type = "text",
  label,
  description,
  placeholder,
}: Props) {
  const { content } = usePageEditor();
  const [localValue, setLocalValue] = useState(content[name]);

  let InputField;
  switch (type) {
    case "text":
      InputField = Input;
      break;
    case "textarea":
      InputField = SidebarTextarea;
      break;
  }

  return (
    <Field>
      <FieldLabel htmlFor={"seo-" + name}>{label}</FieldLabel>
      <InputField
        id={"seo-" + name}
        name={name}
        placeholder={placeholder}
        value={localValue}
        onChange={(evt) => setLocalValue(evt.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

const SidebarTextarea = (props: React.ComponentProps<typeof Textarea>) => (
  <Textarea {...props} cols={3} />
);
