import { useState, useCallback } from "react";

// import TextField from "../Text";
import useField from "../useField";
import Field from "../Field";
import Input from "../base/Input";

import Visibility from "../icons/EyeIcon";
import VisibilityOff from "../icons/EyeSlashIcon";

import IconButton from "../IconButton";

export default function Password(initialProps) {
  const { field, props, fieldProps } = useField({
    pattern: {
      pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\S]{8,}",
      message:
        "Must be at least 8 characters; include both big and small letters and a number.",
    },
    ...initialProps,
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      setShowPassword(showPassword ? false : true);
    },
    [showPassword],
  );

  const button = (
    <IconButton type="button" tabIndex="-1" onClick={handleClickShowPassword}>
      {showPassword ? (
        <VisibilityOff width="1.5rem" height="1.5rem" />
      ) : (
        <Visibility width="1.5rem" height="1.5rem" />
      )}
    </IconButton>
  );

  return (
    <Field {...fieldProps}>
      <Input
        {...props}
        value={field.value}
        type={showPassword ? "text" : "password"}
        end={button}
      />
    </Field>
  );

  // return (
  //   <TextField
  //     {...props}
  //     type={showPassword ? "text" : "password"}
  //     ref={ref}
  //     end={button}
  //   />
  // );
}
