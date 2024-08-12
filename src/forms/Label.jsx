import styles from "./form.module.scss";

export default function Label({ field, className, ...props }) {
  const { required, id } = field.props;
  const classes = styles.label + (className ? " " + className : "");

  return (
    <label className={classes} htmlFor={id} {...props}>
      {field.label}
      {required && <span className={styles.required}>*</span>}
    </label>
  );
}
