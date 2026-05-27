import AuthGuard from "@kenstack/auth/components/AuthGuard";
import PageControlsClient from "./ControlsClient";

type PageControlsProps = {
  className?: string;
};

export default function PageControls(props: PageControlsProps) {
  return (
    <AuthGuard access="admin">
      <PageControlsClient {...props} />
    </AuthGuard>
  );
}
