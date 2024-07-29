import styles from "./dialog.module.scss";

export default function DialogActions({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div
      {...props}
      className={styles.actions + (className ? "" + className : "")}
    >
      {children}
    </div>
  );
}
