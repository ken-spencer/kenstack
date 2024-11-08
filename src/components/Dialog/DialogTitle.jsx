export default function DialogTitle({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div
      {...props}
      className={
        "border-b border-gray-400 bg-gray-300 dark:bg-gray-700  px-2 " +
        (className ? "" + className : "")
      }
    >
      {children}
    </div>
  );
}
