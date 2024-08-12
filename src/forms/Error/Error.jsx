import styles from "./error.module.scss";

export default function Error({ field, ...props }) {
  if (!field.error) {
    return null;
  }

  return (
    <div className={styles.error} {...props}>
      {field.error}
    </div>
  );
}
