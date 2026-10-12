import Avatar from "@kenstack/components/Avatar";
import { Skeleton } from "@kenstack/components/Skeleton";
import { cn } from "@kenstack/lib/utils";

export type MentionMenuOption = {
  avatarUrl?: string | null;
  id: number;
  initials?: string;
  label: string;
};

export type MentionMenuStatus =
  "empty" | "error" | "loading" | "options" | "prompt";

export type MentionMenuProps = {
  message?: string;
  onHighlight: (index: number) => void;
  onSelect: (option: MentionMenuOption) => void;
  options: MentionMenuOption[];
  selectedIndex: number;
  status: MentionMenuStatus;
};

export default function MentionMenu({
  message,
  onHighlight,
  onSelect,
  options,
  selectedIndex,
  status,
}: MentionMenuProps) {
  if (status === "loading") {
    return (
      <>
        <p className="sr-only" role="status">
          {message}
        </p>
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex items-center gap-2 px-1.5 py-1.5">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </>
    );
  }

  if (status !== "options") {
    return <div className="text-muted-foreground px-2.5 py-2">{message}</div>;
  }

  return options.map((option, index) => {
    const selected = index === selectedIndex;

    return (
      <button
        aria-selected={selected}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-left text-inherit",
          selected ? "bg-accent" : "bg-transparent",
        )}
        key={option.id}
        onClick={() => {
          onSelect(option);
        }}
        onMouseEnter={() => {
          onHighlight(index);
        }}
        role="option"
        type="button"
      >
        <Avatar
          className="size-6 shrink-0 p-0 text-[10px]"
          initials={option.initials ?? "?"}
          url={option.avatarUrl}
        />
        <span className="truncate">{option.label}</span>
      </button>
    );
  });
}
