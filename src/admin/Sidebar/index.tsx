import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
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
import { type DefinedAdmin } from "@kenstack/admin";
import NavLink from "./NavLink";

import Content from "./Content";

const sidebarCookieName = "sidebar_state";

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

type AdminSidebarProps = {
  accountMenu?: React.ReactNode;
  admin: DefinedAdmin;
  logo?: React.ReactNode;
  children: React.ReactNode;
};

export default function AdminSidebar(props: AdminSidebarProps) {
  return (
    <Suspense fallback={<AdminSidebarContent {...props} defaultOpen={true} />}>
      <AdminSidebarLoader {...props} />
    </Suspense>
  );
}

async function AdminSidebarLoader(props: AdminSidebarProps) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(sidebarCookieName)?.value !== "false";

  return <AdminSidebarContent {...props} defaultOpen={defaultOpen} />;
}

function AdminSidebarContent({
  admin,
  accountMenu,
  logo,
  children,
  defaultOpen,
}: AdminSidebarProps & { defaultOpen: boolean }) {
  const sidebarNav = (
    <SidebarGroup>
      <SidebarGroupLabel>Administration</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {Object.entries(admin).flatMap(([name, module]) => {
            if (!module.admin) {
              return [];
            }

            const href = "/admin/" + name;
            const icon = module.icon ? (
              <module.icon />
            ) : (
              <span className="w-3" />
            );

            return (
              <Suspense
                key={name}
                fallback={
                  <NavLinkFallback
                    href={href}
                    icon={icon}
                    title={module.title}
                  />
                }
              >
                <NavLink href={href} icon={icon} title={module.title} />
              </Suspense>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <SidebarProvider className="flex" defaultOpen={defaultOpen}>
      <AppSidebar content={sidebarNav} />
      <Content
        logo={logo}
        accountMenu={
          <Suspense>{accountMenu ?? <AccountMenu fallback={null} />}</Suspense>
        }
      >
        {children}
      </Content>
    </SidebarProvider>
  );
}
