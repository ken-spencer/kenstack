import { Suspense } from "react";
import Link from "next/link";
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@kenstack/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import AccountMenu from "@kenstack/components/AccountMenu";
import { type AdminDefinition } from "@kenstack/admin";
import NavLink from "./NavLink";

import Content from "./Content";

function NavLinkFallback({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link href={href}>
          {icon}
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AdminSidebar({
  // content,
  admin,
  logo,
  children,
}: {
  content: React.ReactNode;
  admin: AdminDefinition;
  logo?: React.ReactNode;

  children: React.ReactNode;
}) {
  const sidebarNav = (
    <SidebarGroup>
      <SidebarGroupLabel>Administration</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {Object.entries(admin.modules).map(([name, table]) => {
            const href = "/admin/" + name;
            const icon = table.icon ? <table.icon /> : <span className="w-3" />;

            return (
              <Suspense
                key={name}
                fallback={
                  <NavLinkFallback
                    href={href}
                    icon={icon}
                    title={table.title}
                  />
                }
              >
                <NavLink href={href} icon={icon} title={table.title} />
              </Suspense>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <SidebarProvider
      className="flex"
      // defaultOpen={false}
    >
      <AppSidebar content={sidebarNav} />
      <Content
        logo={logo}
        accountMenu={
          <Suspense>
            <AccountMenu fallback={null} />
          </Suspense>
        }
      >
        {children}
      </Content>
    </SidebarProvider>
  );
}
