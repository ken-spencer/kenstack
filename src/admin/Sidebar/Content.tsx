"use client";
import { type ReactNode } from "react";

import { useSidebar, SidebarTrigger } from "@kenstack/components/ui/sidebar";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarContentProps = {
  logo?: ReactNode;
  moduleLinks: {
    href: string;
    icon: ReactNode;
    title: string;
  }[];
  accountMenu: ReactNode;
  children: ReactNode;
};

export default function SidebarContent({
  logo,
  moduleLinks,
  accountMenu,
  children,
}: SidebarContentProps) {
  const { open, isMobile, toggleSidebar } = useSidebar();

  return (
    <div className="flex flex-1">
      <div>
        <SidebarTrigger className={open ? "hidden" : ""} />
      </div>
      <div className="flex flex-grow flex-col gap-1 md:gap-2">
        <div className="grid min-h-10 grid-cols-[1fr_auto_1fr] items-center px-2 pt-1">
          <button
            className={isMobile ? "justify-self-start" : "hidden"}
            type="button"
            onClick={toggleSidebar}
          >
            <Menu />
          </button>
          <Link href="/" className="justify-self-center md:justify-self-start">
            {logo}
          </Link>
          <HeaderModuleTitle moduleLinks={moduleLinks} />
          <div className="flex min-h-10 min-w-10 items-center justify-end justify-self-end">
            {accountMenu}
          </div>
        </div>
        <div className="px-2 py-1">{children}</div>
      </div>
    </div>
  );
}

function HeaderModuleTitle({
  moduleLinks,
}: {
  moduleLinks: SidebarContentProps["moduleLinks"];
}) {
  const pathname = usePathname();
  const activeModule = moduleLinks.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  if (!activeModule) {
    return null;
  }

  return (
    <div className="hidden items-center gap-2 justify-self-center text-gray-700 md:flex">
      {activeModule.icon}
      <span className="font-bold">{activeModule.title}</span>
    </div>
  );
}
