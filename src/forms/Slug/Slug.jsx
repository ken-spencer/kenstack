import React, { useCallback, useState, useEffect } from "react";
import strToSlug from "@kenstack/utils/strToSlug";

import LockOpenIcon from "../icons/LockOpenIcon";
import LockClosedIcon from "../icons/LockClosedIcon";
import IconButton from "../IconButton";

import useField from "../useField";
import { useForm } from "../context";
import { useShallow } from "zustand/shallow";

import Field from "../Field";
import Input from "../base/Input";

export default function SlugField({
  subscribe,
  onChange,
  ref,
  ...initialProps
}) {
  initialProps.onChange = useCallback(
    (evt) => {
      evt.target.value = strToSlug(evt.target.value, true);
      if (onChange) {
        onChange(evt);
      }

      setInteracted(true);
    },
    [onChange]
  );

  initialProps.onBlur = useCallback((evt, thisField) => {
    thisField.setValue(strToSlug(thisField.value));
  }, []);

  const { field, props, fieldProps } = useField(initialProps);

  const subscribedValue = useForm(
    useShallow((state) => {
      if (Array.isArray(subscribe)) {
        return subscribe
          .map((subName) => state.fields[subName]?.value ?? "")
          .join(" ");
      }
      return state.fields[subscribe]?.value ?? "";
    })
  );

  const [locked, setLocked] = useState(field.getInitialValue() ? true : false);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (interacted || locked || field.getInitialValue()) {
      return;
    }

    const title = subscribe ? subscribedValue : "";
    field.setValue(strToSlug(title));
  }, [interacted, locked, field, subscribe, subscribedValue]);

  return (
    <Field field={field} {...fieldProps}>
      <Input
        {...props}
        value={field.value}
        readOnly={locked}
        end={<LockButton locked={locked} setLocked={setLocked} />}
        ref={field.ref}
      />
    </Field>
  );
}

function LockButton({ locked, setLocked }) {
  if (locked) {
    return (
      <IconButton type="button" onClick={() => setLocked(false)}>
        <LockClosedIcon width="1.25rem" height="1.25em" />
      </IconButton>
    );
  }

  return (
    <IconButton type="button" onClick={() => setLocked(true)}>
      <LockOpenIcon width="1.25rem" height="1.25rem" />
    </IconButton>
  );
}
