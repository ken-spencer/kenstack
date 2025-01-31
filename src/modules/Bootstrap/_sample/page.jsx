import Bootstrap from "@kenstack/modules/Bootstrap";
import { session } from "@/config/server";

import action from "./save";

export default async function BootstrapPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Bootstrap session={session} action={action} />
    </div>
  );
}
