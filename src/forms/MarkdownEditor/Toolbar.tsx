"use client";

import { editorViewCtx, type CmdKey } from "@milkdown/kit/core";
import { useInstance } from "@milkdown/react";
import {
  linkSchema,
  toggleEmphasisCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { TextSelection } from "@milkdown/prose/state";
import { callCommand } from "@milkdown/kit/utils";
import {
  Bold,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { Button } from "@kenstack/components/Button";
import { Input } from "@kenstack/forms/controls/Input";
import { cn } from "@kenstack/lib/utils";

type ToolbarProps = {
  className?: string;
  variant?: "floating" | "static";
};

type ToolbarButtonProps = React.ComponentProps<"button"> & {
  label: string;
  icon: LucideIcon;
};

const headingOptions = [
  { label: "Paragraph", level: null },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
  { label: "Heading 5", level: 5 },
  { label: "Heading 6", level: 6 },
] as const;

export function MarkdownEditorToolbar({
  className,
  variant = "floating",
}: ToolbarProps) {
  const [loading, get] = useInstance();
  const [headingOpen, setHeadingOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const restoreFocusOnClose = useRef(false);
  const restoreLinkFocusOnClose = useRef(false);

  const focusEditor = () => {
    if (loading) {
      return;
    }

    requestAnimationFrame(() => {
      get().action((ctx) => {
        ctx.get(editorViewCtx).focus();
      });
    });
  };

  const run = <T,>(cmdKey: CmdKey<T>, payload?: T) => {
    if (loading) {
      return;
    }

    get().action(callCommand(cmdKey, payload));
    focusEditor();
  };

  const runHeading = (level: (typeof headingOptions)[number]["level"]) => {
    setHeadingOpen(false);
    if (level === null) {
      run(turnIntoTextCommand.key);
      return;
    }

    run(wrapInHeadingCommand.key, level);
  };

  const getSelectedText = () => {
    if (loading) {
      return "";
    }

    let selectedText = "";
    get().action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { from, to, empty } = view.state.selection;
      selectedText = empty ? "" : view.state.doc.textBetween(from, to, " ");
    });
    return selectedText;
  };

  const openLinkEditor = () => {
    setLinkText(getSelectedText());
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = linkUrl.trim();
    const text = linkText.trim() || href;
    if (!href || !text || loading) {
      return;
    }

    get().action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { from, to } = state.selection;
      const linkMark = linkSchema.type(ctx).create({ href });
      const tr = state.tr.insertText(text, from, to);
      const end = from + text.length;
      tr.addMark(from, end, linkMark);
      tr.setSelection(TextSelection.create(tr.doc, end));
      view.dispatch(tr.scrollIntoView());
      view.focus();
    });

    setLinkOpen(false);
  };

  return (
    <div
      className={cn(
        "border-input flex h-[45px] items-center rounded-t-[3px] border-b bg-[#f7f9fc] px-[25px]",
        variant === "floating" && "absolute right-0 left-0 z-20",
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex">
        <Popover
          open={headingOpen}
          onOpenChange={(open) => {
            setHeadingOpen(open);
            if (!open && restoreFocusOnClose.current) {
              restoreFocusOnClose.current = false;
              focusEditor();
            }
          }}
        >
          <PopoverTrigger asChild>
            <ToolbarButton
              label="Heading"
              icon={Heading}
              aria-expanded={headingOpen}
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={2}
            className="border-border bg-popover text-popover-foreground w-auto min-w-36 rounded-[2px] p-0 py-[5px] shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
            autoFocus={false}
            onMouseDown={(event) => event.preventDefault()}
            onEscape={() => {
              restoreFocusOnClose.current = true;
            }}
          >
            {headingOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className="hover:bg-accent hover:text-accent-foreground block w-full px-3 py-1 text-left"
                onClick={() => runHeading(option.level)}
              >
                <HeadingOption option={option} />
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <ToolbarButton
          label="Bold"
          icon={Bold}
          onClick={() => run(toggleStrongCommand.key)}
        />
        <ToolbarButton
          label="Italic"
          icon={Italic}
          onClick={() => run(toggleEmphasisCommand.key)}
        />
      </div>

      <ToolbarDivider />

      <div className="flex">
        <ToolbarButton
          label="Bullet list"
          icon={List}
          onClick={() => run(wrapInBulletListCommand.key)}
        />
        <ToolbarButton
          label="Ordered list"
          icon={ListOrdered}
          onClick={() => run(wrapInOrderedListCommand.key)}
        />
      </div>

      <ToolbarDivider />

      <div className="flex">
        <Popover
          open={linkOpen}
          onOpenChange={(open) => {
            setLinkOpen(open);
            if (!open && restoreLinkFocusOnClose.current) {
              restoreLinkFocusOnClose.current = false;
              focusEditor();
            }
          }}
        >
          <PopoverTrigger asChild>
            <ToolbarButton
              label="Link"
              icon={Link}
              aria-expanded={linkOpen}
              onClick={openLinkEditor}
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={2}
            className="border-border bg-popover text-popover-foreground w-72 rounded-md p-3 shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
            autoFocus={false}
            onEscape={() => {
              restoreLinkFocusOnClose.current = true;
            }}
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Link Text
                <Input
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                URL
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLinkOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={applyLink}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      {...props}
      type="button"
      title={label}
      aria-label={label}
      className={
        "mx-[5px] my-[7px] flex size-8 cursor-pointer items-center justify-center rounded-[3px] border border-[#f7f9fc] p-0 text-[#333] hover:border-[#e4e7ee] hover:bg-white disabled:cursor-default disabled:opacity-40 " +
        (className ?? "")
      }
    >
      <Icon className="size-5 text-[#555]" strokeWidth={2.2} />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-3 my-[14px] h-[18px] w-px bg-[#e1e3e9]" />;
}

function HeadingOption({
  option,
}: {
  option: (typeof headingOptions)[number];
}) {
  if (option.level === 1) {
    return <span className="text-2xl font-semibold">Heading 1</span>;
  }

  if (option.level === 2) {
    return <span className="text-xl font-semibold">Heading 2</span>;
  }

  if (option.level === 3) {
    return <span className="text-lg font-semibold">Heading 3</span>;
  }

  if (option.level) {
    return <span className="font-semibold">{option.label}</span>;
  }

  return <span>{option.label}</span>;
}
