import { Button as ButtonShad } from "@kenstack/components/ui/button";
import type { CmdKey } from "@milkdown/kit/core";

import { useInstance } from "@milkdown/react";
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
} from "@milkdown/kit/preset/commonmark";
import { wrapInHeadingCommand } from "@milkdown/kit/preset/commonmark";
import { callCommand } from "@milkdown/kit/utils";

import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  type LucideIcon,
} from "lucide-react";

function Button({
  icon: Icon,
  ...props
}: React.ComponentProps<"button"> & { icon: LucideIcon }) {
  return (
    <ButtonShad
      {...props}
      variant="ghost"
      // size="icon"
      type="button"
      className="size-8"
      onMouseDown={(e) => e.preventDefault()} // keep selection in editor
    >
      <Icon className="size-6" />
    </ButtonShad>
  );
}

export function Toolbar() {
  const [loading, get] = useInstance();

  // const run = (cmdKey: CmdKey, payload?: unknown) => {
  const run = <T,>(cmdKey: CmdKey<T>, payload?: T) => {
    if (loading) {
      return;
    }
    const editor = get();

    editor.action(callCommand(cmdKey, payload));
  };

  return (
    <div className="absolute flex -top-9.5 left-0 right-0  border border-gray-700/90 bg-gray-200/90">
      <Button onClick={() => run(toggleStrongCommand.key)} icon={Bold} />
      <Button onClick={() => run(toggleEmphasisCommand.key)} icon={Italic} />
      <Button
        onClick={() => run(wrapInHeadingCommand.key, 1)}
        icon={Heading1}
      />
      <Button
        onClick={() => run(wrapInHeadingCommand.key, 2)}
        icon={Heading2}
      />
      <Button
        onClick={() => run(wrapInHeadingCommand.key, 3)}
        icon={Heading3}
      />
    </div>
  );
}
