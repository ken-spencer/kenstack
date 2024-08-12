import styles from "./form.module.scss";

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

  let classes = styles.field;
  if (required) {
    classes += " " + styles.required;
  }
  if (className) {
    classes += className;
  }

  return (
    <div className={classes}>
      {label && (
        <label htmlFor={id} className={styles.label + " " + styles.mb}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
