"use client";

import kebabCase from "lodash-es/kebabCase";
import { useContext, useState, useEffect } from "react";

import { Lock, LockOpen } from "lucide-react";
import Button from "@kenstack/components/Button";

import { useFieldAccess } from "@kenstack/forms/fieldAccess";
import { FieldLockedContext } from "@kenstack/forms/fieldLocked";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";
import { useFormContext } from "react-hook-form";
import { twMerge } from "tailwind-merge";

// Adornments are omitted because the lock button occupies the input's end slot.
type InputProps = Omit<
  React.ComponentProps<typeof Input>,
  "startAdornment" | "endAdornment"
> &
  FieldProps & {
    inputClass?: string;
    watch?: string | string[];
  };

export default function SlugField({
  name,
  label,
  help,
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
  const watchedValue = Array.isArray(watchField)
    ? watch(watchField)
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
    : watch(watchField);
  const defaultValue = defaultValues ? defaultValues[name] : undefined;
  const [locked, setLocked] = useState(defaultValue ? true : false);
  // A slug the admin editor hides or locks, itself or as part of a locked field, stays as it is: no
  // unlocking, no following the title and no rewriting on blur.
  const isInsideLock = useContext(FieldLockedContext);
  const isRestricted = useFieldAccess(name) !== undefined || isInsideLock;
  const [wasEdited, setWasEdited] = useState(false);

  // leaving lock out of this effect atm as it potentially could wipe out a user change if clicked otherwise.
  useEffect(() => {
    if (!locked && !isRestricted && watchedValue !== undefined && !wasEdited) {
      const slug = kebabCase(watchedValue);
      setValue(name, slug, { shouldDirty: true, shouldTouch: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue, name, setValue, wasEdited]);

  return (
    <Field
      name={name}
      label={label}
      help={help}
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
                if (!locked && !isRestricted) {
                  setValue(name, kebabCase(evt.currentTarget.value));
                }
              }}
              className={twMerge(
                "-mr-8 pr-9",
                locked && "bg-muted",
                inputClass,
              )}
              readOnly={locked}
            />
          </FormControl>
          <Button
            size="icon"
            tooltip={locked ? "Unlock" : "Lock"}
            type="button"
            variant="ghost"
            disabled={isRestricted}
            onClick={() => {
              setLocked(!locked);
            }}
          >
            {locked ? (
              <Lock className="text-foreground" />
            ) : (
              <LockOpen className="text-foreground" />
            )}
          </Button>
        </div>
      )}
    />
  );
}
