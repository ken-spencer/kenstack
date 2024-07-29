import styles from "./dialog.module.scss";

export default function DialogBody({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div {...props} className={styles.body + (className ? "" + className : "")}>
      {children}
    </div>
  );
}
