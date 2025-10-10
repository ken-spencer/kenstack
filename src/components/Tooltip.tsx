import { twMerge } from "tailwind-merge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kenstack/components/ui/tooltip";

type TooltipProps = React.ComponentProps<"div"> & {
  content: React.ReactNode;
};

export default function TooltipCont({
  className,
  content,
  children,
}: TooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger suppressHydrationWarning asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          className={twMerge("border bg-white text-gray-800", className)}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
