"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import Button from "@kenstack/components/Button";

export default function ChildModuleLinks({
  childModules,
}: {
  childModules: {
    href: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
  }[];
}) {
  if (!childModules.length) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Manage</h2>
      <div className="flex flex-col gap-2">
        {childModules.map(({ href, icon: Icon, title }) => (
          <Button
            key={href}
            asChild
            className="w-full justify-start"
            variant="outline"
          >
            <Link href={href}>
              {Icon ? <Icon className="size-4" /> : null}
              {title}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
