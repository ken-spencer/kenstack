import LogoutButton from "./Button";
import logoutAction from "../../../../auth/logoutAction";

export default function Logout() {
  return (
    <form action={logoutAction}>
      <LogoutButton />
    </form>
  );
}
