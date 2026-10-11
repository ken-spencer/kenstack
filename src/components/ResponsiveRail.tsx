// Public entry point: ResponsiveRail, the default export, for host sites' and Sympolis's admin edit
// forms. The rail floats beside the primary content from lg and comes directly after it on phones,
// before the rest.
import type { ReactNode } from "react";

import { cn } from "@kenstack/lib/utils";

export default function ResponsiveRail({
  children,
  className,
  primary,
  rail,
}: {
  children?: ReactNode;
  className?: string;
  primary: ReactNode;
  rail?: ReactNode;
}) {
  const mainColumnClassName = rail ? "lg:mr-[22rem]" : undefined;

  return (
    <div className={cn("flex max-w-5xl flex-col gap-5 lg:block", className)}>
      {rail ? (
        <div className="order-2 w-full space-y-5 lg:order-none lg:float-right lg:ml-6 lg:w-80">
          {rail}
        </div>
      ) : null}
      <div className={cn("order-1 min-w-0 lg:order-none", mainColumnClassName)}>
        {primary}
      </div>
      {children ? (
        <div
          className={cn(
            "order-3 min-w-0 lg:order-none lg:mt-5",
            mainColumnClassName,
          )}
        >
          {children}
        </div>
      ) : null}
      {rail ? <div className="clear-both hidden lg:block" /> : null}
    </div>
  );
}
