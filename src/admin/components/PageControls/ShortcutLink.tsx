import AuthGuard from "@kenstack/auth/components/AuthGuard";
import ShortcutLinkClient from "./ShortcutLinkClient";

export default function AdminShortcutLink(props: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <AuthGuard access="admin">
      <ShortcutLinkClient {...props} />
    </AuthGuard>
  );
}

export function AdminRecordShortcutLink({
  moduleName,
  id,
  title,
  className,
}: {
  moduleName: string;
  id: number;
  title: string;
  className?: string;
}) {
  if (id < 1) {
    return null;
  }

  return (
    <AdminShortcutLink
      href={`/admin/${moduleName}/${id}`}
      label={`Edit ${title}`}
      className={className}
    />
  );
}
