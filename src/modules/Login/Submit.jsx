import Link from "next/link";
import Submit from "@kenstack/forms/Submit";

import { useLogin } from "./context";

export default function LoginSubmit() {
  const { forgottenPasswordPath } = useLogin();
  return (
    <div className="flex gap-4">
      <div className="">
        <Submit>Login</Submit>
      </div>
      <div className="flex-grow text-right">
        <Link href={forgottenPasswordPath}>Forgotten your password?</Link>
      </div>
    </div>
  );
}
