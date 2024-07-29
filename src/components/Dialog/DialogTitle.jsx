import styles from "./dialog.module.scss";

export default function DialogTitle({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div
      {...props}
      className={styles.title + (className ? "" + className : "")}
    >
      {children}
    </div>
  );
}
