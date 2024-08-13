type onClickType = (event?: React.MouseEvent<HTMLButtonElement>) => void;

export default function IconButton({
  title,
  icon,
  active,
  disabled,
  onClick,
}: {
  title: string;
  icon: JSX.Element;
  active?: boolean;
  disabled?: boolean;
  onClick: onClickType;
}): JSX.Element {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={"toolbar-item spaced " + (active ? "active" : "")}
      aria-label="Insert link"
      title={title}
      type="button"
    >
      {icon}
    </button>
  );
}
