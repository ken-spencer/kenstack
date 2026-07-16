import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { AdminParentRecord } from "@kenstack/admin/queries/parent";

type BreadcrumbsProps = {
  currentTitle?: string;
  moduleName: string;
  moduleTitle: string;
  parent?: AdminParentRecord | null;
};

export default function Breadcrumbs({
  currentTitle,
  moduleName,
  moduleTitle,
  parent,
}: BreadcrumbsProps) {
  if (!parent) {
    return null;
  }

  const items = [
    {
      href: `/admin/${parent.name}`,
      title: parent.title,
    },
    {
      href: `/admin/${parent.name}/${parent.id}`,
      title: parent.recordTitle,
    },
    currentTitle
      ? {
          href: `/admin/${parent.id}/${moduleName}`,
          title: moduleTitle,
        }
      : {
          title: moduleTitle,
        },
    ...(currentTitle ? [{ title: currentTitle }] : []),
  ] satisfies { href?: string; title: string }[];

  return (
    <nav
      aria-label="Admin breadcrumb"
      className="text-muted-foreground mb-2 flex min-w-0 flex-wrap items-center gap-1 text-sm"
    >
      {items.map((item, index) => (
        <span
          key={`${item.title}:${index}`}
          className="flex min-w-0 items-center gap-1"
        >
          {index > 0 ? (
            <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
          ) : null}
          {item.href ? (
            <Link
              className="hover:text-foreground truncate hover:underline"
              href={item.href}
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-foreground truncate font-medium">
              {item.title}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
