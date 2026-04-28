"use client";
import React from "react";

import { useSidebar, SidebarTrigger } from "@kenstack/components/ui/sidebar";

import { Home, Menu } from "lucide-react";
import Link from "next/link";

export default function SidebarContent({
  logo,
  accountMenu,
  children,
}: {
  logo?: React.ReactNode;
  accountMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, isMobile, toggleSidebar } = useSidebar();

  return (
    <div className="flex flex-1">
      <div>
        <SidebarTrigger className={open ? "hidden" : ""} />
      </div>
      <div className="lex flex-grow flex-col gap-4">
        <div className="flex justify-between px-2 pt-1">
          <button
            className={isMobile ? "" : "hidden"}
            type="button"
            onClick={toggleSidebar}
          >
            <Menu />
          </button>
          <Link href="/">{logo}</Link>
          {accountMenu}
        </div>
        <div className="px-2 py-1">{children}</div>
      </div>
    </div>
  );
}
