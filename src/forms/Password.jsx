import { useState, useCallback, forwardRef } from "react";

import TextField from "./Input";

import Visibility from "./icons/EyeIcon";
import VisibilityOff from "./icons/EyeSlashIcon";

import IconButton from "./IconButton";

const Password = (initialProps, ref) => {
  const props = {
    pattern: {
      pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\S]{8,}",
      message:
        "Must be at least 8 characters; include both big and small letters and a number.",
    },
    ...initialProps,
  };

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
    <TextField
      {...props}
      type={showPassword ? "text" : "password"}
      ref={ref}
      end={button}
    />
  );
};

Password.displayName = "PasswordField";
export default forwardRef(Password);
