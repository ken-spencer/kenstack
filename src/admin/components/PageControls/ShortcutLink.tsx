import AuthGuard from "@kenstack/auth/components/AuthGuard";
import ShortcutLinkClient from "./ShortcutLinkClient";

type ShortcutLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export default function AdminShortcutLink(props: ShortcutLinkProps) {
  return (
    <AuthGuard access="admin">
      <ShortcutLinkClient {...props} />
    </AuthGuard>
  );
}
