import { twMerge } from "tailwind-merge";
import {useMemo} from "react"

export default function Field({ field, ...props }) {
  const fp = field?.props || {};

  const {
    label = props.label === undefined ? field?.label : props.label,
    id = fp.id,
    required = fp.required,
    error = field?.error,
    containerClass = field?.containerClass,
    labelClass = field?.labelClass,
    children,
  } = props;

  let classes = useMemo(() => twMerge(
    "field",
    required && "required",
    containerClass,
  ), [required, containerClass]);

  let classesLabel = useMemo(() => twMerge(
    "label mb-2",
    labelClass,
  ), [required, labelClass]);


  return (
    <div className={classes}>
      {label && (
        <label htmlFor={id} className={classesLabel}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
