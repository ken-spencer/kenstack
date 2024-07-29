import Dialog from "./Dialog";
import styles from "./dialog.module.scss";

export default function Confirm({
  title = "Confirm",
  open = false,
  onClose = null,
  children = "Are you sure?",
}) {
  return (
    <Dialog
      title={title}
      open={open}
      onClose={onClose}
      className={styles.confirm}
    >
      <div className="p-5">{children}</div>
    </Dialog>
  );
}
