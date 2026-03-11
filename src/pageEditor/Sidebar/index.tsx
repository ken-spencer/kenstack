import AdminSidebar from "./Sidebar";
import { deps } from "@app/deps";

export default async function AdminSIdebarCont({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = deps;

  if (await auth.hasRole("admin")) {
    return <AdminSidebar>{children}</AdminSidebar>;
  }
  return children;
}
