import type { MouseEventHandler, ReactNode } from "react";

// Mousedown must not blur a focused field beside the control: blur-mode
// validation would insert an error and shift the control mid-click, eating
// the first click.
export default function LinkButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="text-sm underline underline-offset-4 disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      {children}
    </button>
  );
}
