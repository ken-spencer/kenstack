import Field, { type FieldProps } from "@kenstack/forms/Field";
import { X } from "lucide-react";

import Search from "./Search";

type InputProps = React.ComponentProps<"input"> &
  FieldProps & {
    // inputClass?: string;
  };

export default function Tags({
  name,
  label,
  description,
  className,
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
            {field.value.map((tag) => {
              return (
                <span
                  key={tag.name}
                  className="inline-flex  items-center gap-2"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = field.value.filter((v) => v !== tag);
                      field.onChange(newValue);
                    }}
                  >
                    <X className="text-gray-800" />
                  </button>
                </span>
              );
            })}
            {/* <input
              className="flex-1 min-w-36 p-0 appearance-none border-none  bg-transparent focus:outline-none focus:ring-0"
              // className="flex-1"
              placeholder="Enter tag"
              value={value}
              ref={inputRef}
              autoComplete="off"
              onKeyDown={(evt) => {
                if (evt.key === "Enter" && value.length) {
                  evt.preventDefault();
                  // avoid duplication
                  const slug = value
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "");

                  if (field.value.some((v) => v.slug === slug)) {
                    setValue("");
                    return;
                  }
                  const newValue = [
                    ...field.value,
                    { name: value.trim(), slug },
                  ].sort((a, b) => a.name.localeCompare(b.name));
                  field.onChange(newValue);
                  setValue("");
                }
              }}
              onChange={(evt) => {
                setValue(evt.target.value);
              }}
              onFocus={() => {
                setFocusing(true);
              }}
              onBlur={(evt) => {
                const d = dialogRef.current;
                if (!d || !d.contains(evt.relatedTarget)) {
                  setFocusing(false);
                }
                // delay to give enough time to click on the dialog before removing it.
                setTimeout(() => {}, 50);
              }}
            /> */}
            <Search
              // focusing={focusing}
              field={field}
              // keywords={debouncedValue}
            />
          </div>
        </>
      )}
    />
  );
}

Tags.defaultValue = [];
