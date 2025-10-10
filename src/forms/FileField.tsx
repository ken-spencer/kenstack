"use client";

// import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/components/ui/input";
import { FormControl } from "@kenstack/components/ui/form";
import { Button } from "@kenstack/components/ui/button";

import { X } from "lucide-react";

const allowed = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const icons = {
  "application/pdf": "/icons/pdf.svg",
  "application/msword": "/icons/doc.svg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "/icons/docx.svg",
};

type FileFieldProps = FieldProps & {
  className?: string;
  accept?: string[];
};

export default function InputField({
  name,
  label,
  description,
  className,
  accept = allowed,
}: FileFieldProps) {
  const acceptStr = accept.join(", ");
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div>
          <label>
            <FormControl>
              <Input
                type="file"
                accept={acceptStr}
                className="sr-only"
                // {...field}
                onChange={(evt) => {
                  const file = evt.target.files[0];
                  field.onChange(file);
                }}
              />
            </FormControl>
            {field.value ? (
              <div className="flex items-center gap-2">
                <img
                  src={icons[field.value.type] ?? "/icons/default.svg"}
                  width="24"
                  height="24"
                  alt=""
                />
                <span>{field.value?.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    field.onChange(undefined);
                  }}
                  type="button"
                >
                  <X className="size-6" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-none"
              >
                Browse ...
              </Button>
            )}
          </label>
        </div>
      )}
    />
  );
}
