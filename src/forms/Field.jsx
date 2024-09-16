export default function Field({ field, ...props }) {
  const fp = field?.props || {};

  const {
    label = props.label === undefined ? field?.label : props.label,
    id = fp.id,
    required = fp.required,
    error = field?.error,
    className,
    children,
  } = props;

  let classes = "field";
  if (required) {
    classes += " required";
  }
  if (className) {
    classes += className;
  }

  return (
    <div className={classes}>
      {label && (
        <label htmlFor={id} className="label mb-2">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
