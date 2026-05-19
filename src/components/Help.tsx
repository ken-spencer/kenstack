"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@kenstack/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";
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
          <CircleHelp className="size-3.5 text-gray-500" />
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
