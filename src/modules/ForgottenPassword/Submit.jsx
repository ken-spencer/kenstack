import Link from "next/link";
import Submit from "@kenstack/forms/Submit";

import { useForgottenPassword } from "./context";

export default function LoginSubmit() {
  const { loginPath } = useForgottenPassword();
  return (
    <div className="flex gap-4">
      <div className="">
        <Submit>Request link</Submit>
      </div>
      <div className="flex-grow text-right">
        <Link href={loginPath}>Return to login</Link>
      </div>
    </div>
  );
}
