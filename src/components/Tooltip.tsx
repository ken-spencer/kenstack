import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kenstack/components/ui/tooltip";
import { twMerge } from "tailwind-merge";

export type TooltipBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

type TooltipProps = {
  children: React.ReactElement;
  className?: string;
  content: React.ReactNode;
  onlyBelow?: TooltipBreakpoint;
};

const onlyBelowClassNames = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
  "2xl": "2xl:hidden",
} satisfies Record<TooltipBreakpoint, string>;

export default function TooltipCont({
  className,
  content,
  children,
  onlyBelow,
}: TooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger suppressHydrationWarning asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          className={twMerge(
            onlyBelow ? onlyBelowClassNames[onlyBelow] : undefined,
            className,
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
