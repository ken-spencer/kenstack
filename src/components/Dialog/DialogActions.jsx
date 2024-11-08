export default function DialogActions({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div
      {...props}
      className={"admin-dialog-actions" + (className ? "" + className : "")}
    >
      {children}
    </div>
  );
}
