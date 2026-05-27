import AuthGuard from "@kenstack/auth/components/AuthGuard";
import Modal from "./Modal";

export default function PageEditSettings() {
  return (
    <AuthGuard access="admin">
      <Modal />
    </AuthGuard>
  );
}
