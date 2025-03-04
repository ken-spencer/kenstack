import { useRef, useState } from "react";
import useField from "../useField";
import Field from "../Field";
import DeleteIcon from "@kenstack/icons/Clear";
import useDebounce from "@kenstack/hooks/useDebounce";

import dynamic from "next/dynamic";
const Dialog = dynamic(() => import("./Dialog"), {
  ssr: false,
});

export default function Tags(initialProps) {
  const dialogRef = useRef();
  const inputRef = useRef();
  const [value, debouncedValue, setValue] = useDebounce();
  const [focusing, setFocusing] = useState(false);
  const { field, props, fieldProps } = useField(initialProps);

  const tags = Array.isArray(field.value) ? field.value : [];

  return (
    <Field {...fieldProps}>
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {tags.map((tag) => {
          return (
            <span key={tag} className="inline-flex  items-center gap-2">
              {tag}
              <input
                className="sr-only"
                type="checkbox"
                value={tag}
                name={props.name}
                defaultChecked
              />
              <button
                type="button"
                onClick={() => {
                  const newValue = field.value.filter((v) => v !== tag);
                  field.setValue(newValue);
                }}
              >
                <DeleteIcon />
              </button>
            </span>
          );
        })}
        <input
          className="flex-1 min-w-36 p-0 appearance-none border-none  bg-transparent focus:outline-none focus:ring-0"
          id={props.id}
          placeholder="Enter tag"
          value={value}
          ref={inputRef}
          autoComplete="off"
          onKeyDown={(evt) => {
            if (evt.key === "Enter" && value.length > 1) {
              evt.preventDefault();
              // avoid duplication
              if (Array.isArray(field.value) && field.value.includes(value)) {
                return;
              }
              const newValue = field.value
                ? [...field.value, value].sort()
                : [value];
              field.setValue(newValue);
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
        />
      </div>
      {focusing && (
        <Dialog
          ref={dialogRef}
          inputRef={inputRef}
          field={field}
          keywords={debouncedValue}
          setKeywords={setValue}
        />
      )}
    </Field>
  );
}
