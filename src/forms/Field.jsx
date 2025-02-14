import { twMerge } from "tailwind-merge";
import { useMemo } from "react";

export default function Field({ field, ...props }) {
  const fp = field?.props || {};

  const {
    label = props.label === undefined ? field?.label : props.label,
    required = fp.required,
    error = "",
    containerClass = "",
    htmlFor,
    labelClass = "",
    children,
  } = props;

  let classes = useMemo(
    () => twMerge("field", required && "required", containerClass),
    [required, containerClass],
  );

  let classesLabel = useMemo(() => twMerge("label", labelClass), [labelClass]);

  return (
    <div className={classes}>
      {label && (
        <label htmlFor={htmlFor} className={classesLabel}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
