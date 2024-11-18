import Bootstrap from "@kenstack/modules/Bootstrap";
import session from "@/session";
import save from "./save";

export default async function Page() {
  return <Bootstrap session={session} saveAction={save} />;
}
