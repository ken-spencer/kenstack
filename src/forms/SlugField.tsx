"use client";

import kebabCase from "lodash-es/kebabCase";
import { useState, useEffect } from "react";

import { Lock, LockOpen } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/components/ui/input";
import { FormControl } from "@kenstack/components/ui/form";
import { useFormContext } from "react-hook-form";
import { twMerge } from "tailwind-merge";

type InputProps = React.ComponentProps<"input"> &
  FieldProps & {
    inputClass?: string;
    watch?: string;
  };

export default function SlugField({
  name,
  label,
  description,
  className,
  inputClass,
  watch: watchField = "title",
  ...props
}: InputProps) {
  const {
    watch,
    setValue,
    formState: { defaultValues },
  } = useFormContext();
  const watchedValue = watch(watchField);
  const defaultValue = defaultValues[name];
  const [locked, setLocked] = useState(defaultValue ? true : false);
  const [wasEdited, setWasEdited] = useState(false);

  // leaving lock out of this effect atm as it potentially could wipe out a user change if clicked otherwise.
  useEffect(() => {
    if (!locked && watchedValue !== undefined && !wasEdited) {
      const slug = kebabCase(watchedValue);
      setValue(name, slug, { shouldDirty: true, shouldTouch: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue, name, setValue, wasEdited]);

  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex-cl flex items-center">
          <FormControl>
            <Input
              {...props}
              {...field}
              onChange={(evt) => {
                if (!locked) {
                  setWasEdited(true);
                  field.onChange(evt.target.value);
                }
              }}
              onBlur={(evt) => {
                if (!locked) {
                  setValue(name, kebabCase(evt.currentTarget.value));
                }
              }}
              className={twMerge(
                "-mr-8 pr-9",
                locked && "bg-gray-300",
                inputClass
              )}
              readOnly={locked}
            />
          </FormControl>
          <IconButton
            tooltip={locked ? "Unlock" : "Lock"}
            type="button"
            onClick={() => {
              setLocked(!locked);
            }}
          >
            {locked ? (
              <Lock className="text-gray-800" />
            ) : (
              <LockOpen className="text-gray-800" />
            )}
          </IconButton>
        </div>
      )}
    />
  );
}
