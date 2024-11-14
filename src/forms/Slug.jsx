import React, { useCallback, useState, useEffect, forwardRef } from "react";

import LockOpenIcon from "./icons/LockOpenIcon";
import LockClosedIcon from "./icons/LockClosedIcon";
import IconButton from "./IconButton";

import useField from "./useField";
import useFieldSubscribe from "./useFieldSubscribe";

import Field from "./Field";
import Input from "./base/Input";

const SlugField = ({ subscribe, onChange, ...props }, ref) => {
  props.onChange = useCallback(
    (evt) => {
      evt.target.value = evt.target.value
        .toLowerCase()
        .replace(/\s+/g, "-") // replace spaces
        .replace(/[^\w-]+/g, "") // remove not word characters
        .replace(/--+/g, "-"); // ensure only single hyphens
      if (onChange) {
        onChange(evt);
      }
      setInteracted(true);
    },
    [onChange],
  );

  props.onBlur = useCallback((evt, slugField) => {
    slugField.value = strToSlug(slugField.value);
  }, []);

  const field = useField(props, ref);
  const subscribedField = useFieldSubscribe(subscribe);
  const [locked, setLocked] = useState(field.initialValue ? true : false);
  const [interacted, setInteracted] = useState(false);
  // const [listen, setListen] = useState(field.initialValue ? false : true);

  useEffect(() => {
    if (interacted || field.initialValue) {
      return;
    }

    const title = subscribe ? subscribedField?.value || "" : "";
    field.value = strToSlug(title);
  }, [
    interacted,
    field.initialValue,
    locked,
    field,
    subscribe,
    subscribedField?.value,
  ]);

  return (
    <Field field={field}>
      <Input
        {...field.props}
        value={field.value}
        readOnly={locked}
        end={<LockButton locked={locked} setLocked={setLocked} />}
        ref={field.ref}
      />
    </Field>
  );
};

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

function strToSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // replace spaces
    .replace(/[^\w-]+/g, "") // remove not word characters
    .replace(/--+/g, "-") // ensure only single hyphens
    .replace(/^-+|-+$/g, ""); // remove hypen from start and end.
}

SlugField.displayName = "SlugField";
export default forwardRef(SlugField);
