import { useRef, useState, useMemo } from "react";

import useField from "../useField";
import Dialog from "./Dialog";

import Field from "@kenstack/forms/Field";
import AddIcon from "@kenstack/icons/Add";
import Inner from "./Inner";

export default function MultiSelect({
  options: initialOptions = null, // array of options
  loadOptions = null, // function to load options
  ...initialProps
}) {
  const inputRef = useRef();
  const { field, fieldProps } = useField(initialProps, inputRef);
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () =>
      initialOptions &&
      initialOptions.map((option) => {
        if (Array.isArray(option)) {
          return option;
        } else if (typeof option === "string") {
          return [option, option];
        }
      }),

    [initialOptions],
  );

  return (
    <Field {...fieldProps} label={false}>
      <div className="label flex items-center gap-2">
        {field.label}
        <button
          className={"flex gap-1" + (open && " invisible")}
          type="button"
          onClick={() => setOpen(true)}
        >
          <AddIcon />
        </button>
      </div>
      <div className="relative">
        <Dialog
          open={open}
          field={field}
          options={options}
          loadOptions={loadOptions}
          onClose={() => setOpen(false)}
        />
      </div>
      <Inner field={field} options={options} loadOptions={loadOptions} />
    </Field>
  );
}

MultiSelect.defaultValue = [];
