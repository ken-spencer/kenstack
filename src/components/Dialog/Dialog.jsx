import DialogContainer from "./DialogContainer";
import DialogTitle from "./DialogTitle";
import DialogBody from "./DialogBody";

export default function Dialog({
  title = "",
  children,
  className = "",
  actions = null,
  ...props
}) {
  return (
    <DialogContainer
      className={"admin-border max-w-2xl " + className}
      {...props}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogBody>{children}</DialogBody>
      {actions && <div className="flex gap-2 justify-end p-2">{actions}</div>}
    </DialogContainer>
  );
}
