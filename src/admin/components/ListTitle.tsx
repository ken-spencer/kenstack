import Link from "next/link";
import type { ReactNode } from "react";

export default function ListTitle({
  children,
  path,
  title,
}: {
  children?: ReactNode;
  path: string;
  title: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <Link className="max-w-full self-start truncate text-lg" href={path}>
        {title}
      </Link>
      {children ? (
        <div className="text-muted-foreground flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-sm">
          {children}
        </div>
      ) : null}
    </div>
  );
}
