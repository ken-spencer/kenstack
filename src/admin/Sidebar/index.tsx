import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@kenstack/components/Sidebar";
import { Skeleton } from "@kenstack/components/Skeleton";
import { AppSidebar } from "./app-sidebar";
import AccountMenu from "@kenstack/components/AccountMenu";
import NavLink from "./NavLink";
import { deps } from "@app/deps";

import Content from "./Content";

const sidebarCookieName = "sidebar_state";

type AdminSidebarProps = {
  accountMenu?: React.ReactNode;
  logo?: React.ReactNode;
  sidebarAfter?: React.ReactNode;
  sidebarBefore?: React.ReactNode;
  children: React.ReactNode;
};

const accountMenuFallback = <Skeleton className="size-9 rounded-full" />;

export default function AdminSidebar(props: AdminSidebarProps) {
  return (
    <Suspense fallback={null}>
      <AdminSidebarWithDefaultOpen {...props} />
    </Suspense>
  );
}

async function AdminSidebarWithDefaultOpen(props: AdminSidebarProps) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(sidebarCookieName)?.value !== "false";

  return <AdminSidebarContent {...props} defaultOpen={defaultOpen} />;
}

function AdminSidebarContent({
  accountMenu,
  logo,
  sidebarAfter,
  sidebarBefore,
  children,
  defaultOpen,
}: AdminSidebarProps & { defaultOpen: boolean }) {
  const moduleLinks = Object.entries(deps.modules).flatMap(([name, module]) => {
    if (!module.admin) {
      return [];
    }

    return [
      {
        href: "/admin/" + name,
        headerIcon: module.icon ? (
          <module.icon className="size-4 text-gray-800" />
        ) : null,
        icon: module.icon ? <module.icon /> : <span className="w-3" />,
        name,
        title: module.title,
      },
    ];
  });
  const childLinksByParent = new Map<string, typeof moduleLinks>();

  for (const link of moduleLinks) {
    const moduleConfig = deps.modules[link.name];
    const navigationParent = moduleConfig.navigationParent;

    if (!navigationParent || moduleConfig.parent) {
      continue;
    }

    childLinksByParent.set(navigationParent, [
      ...(childLinksByParent.get(navigationParent) ?? []),
      link,
    ]);
  }

  const adminModules = moduleLinks.filter(({ name }) => {
    const moduleConfig = deps.modules[name];

    return !moduleConfig.parent && !moduleConfig.navigationParent;
  });

  const sidebarNav = (
    <>
      {sidebarBefore}
      <SidebarGroup>
        <SidebarGroupLabel>Administration</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {adminModules.map(({ href, icon, name, title }) => {
              return (
                <NavLink
                  key={href}
                  href={href}
                  icon={icon}
                  title={title}
                  navChildren={childLinksByParent.get(name)}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {sidebarAfter}
    </>
  );

  return (
    <SidebarProvider className="flex" defaultOpen={defaultOpen}>
      <AppSidebar content={sidebarNav} />
      <Content
        logo={logo}
        moduleLinks={moduleLinks.map(({ headerIcon, name, title }) => ({
          icon: headerIcon,
          name,
          title,
        }))}
        accountMenu={
          <Suspense fallback={accountMenuFallback}>
            {accountMenu ?? <AccountMenu fallback={accountMenuFallback} />}
          </Suspense>
        }
      >
        {children}
      </Content>
    </SidebarProvider>
  );
}

export { default as AdminSidebarNavLink } from "./NavLink";
