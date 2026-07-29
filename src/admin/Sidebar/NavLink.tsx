"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@kenstack/components/Sidebar";
import { GuardedLink } from "@kenstack/forms/NavigationBlocker";

export default function NavLink({
  href,
  icon,
  navChildren,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  navChildren?: {
    href: string;
    icon: React.ReactNode;
    title: string;
  }[];
  title: string;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isCurrent = isActivePath(pathname, href);
  const activeChild = Boolean(
    navChildren?.some((child) => isActivePath(pathname, child.href)),
  );
  const isActive = isCurrent || activeChild;
  const [isHovered, setIsHovered] = useState(false);
  const textClassName =
    "underline-offset-4 " +
    (isCurrent ? "text-blue-500" : isHovered ? "underline" : "");
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <GuardedLink
          href={href}
          aria-current={isCurrent ? "page" : undefined}
          onMouseEnter={() => {
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
          }}
          onClick={closeMobileSidebar}
        >
          {icon}
          <span className={textClassName}>{title}</span>
        </GuardedLink>
      </SidebarMenuButton>
      {isActive && navChildren?.length ? (
        <SidebarMenuSub>
          {navChildren.map((child) => {
            const childIsActive = isActivePath(pathname, child.href);

            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton asChild isActive={childIsActive}>
                  <GuardedLink
                    href={child.href}
                    aria-current={childIsActive ? "page" : undefined}
                    onClick={closeMobileSidebar}
                  >
                    {child.icon}
                    <span
                      className={
                        "underline-offset-4 " +
                        (childIsActive ? "text-blue-500" : "")
                      }
                    >
                      {child.title}
                    </span>
                  </GuardedLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
