import { Suspense } from "react";

import { deps } from "@app/deps";
import Modal from "./Modal";

export default function PageEditSettings() {
  return (
    <Suspense>
      <PageEditSettingsCont />
    </Suspense>
  );
}
export async function PageEditSettingsCont() {
  const { auth } = deps;

  if (await auth.hasRole("admin")) {
    return (
      <div className="absolute top-0 right-0">
        <Modal />
      </div>
    );
  }
}
