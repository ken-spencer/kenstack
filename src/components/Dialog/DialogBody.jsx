export default function DialogBody({
  className = null,
  children = null,
  ...props
}) {
  return (
    <div {...props} className={"p-2 " + (className ? "" + className : "")}>
      {children}
    </div>
  );
}
