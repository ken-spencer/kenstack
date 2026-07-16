"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { cn } from "@kenstack/lib/utils";

type HelpProps = {
  className?: string;
  message: React.ReactNode;
};

export default function Help({ className, message }: HelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Help"
          className={cn("size-4 rounded-full", className)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <CircleHelp className="text-muted-foreground size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="text-sm leading-6">
        <div
          className="cursor-text select-text"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        >
          {message}
        </div>
      </PopoverContent>
    </Popover>
  );
}
