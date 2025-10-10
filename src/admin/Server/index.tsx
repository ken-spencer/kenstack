import { ReactNode } from "react";
import type { ServerConfig } from "@kenstack/admin/types";
import { ServerProvider } from "./context";
import { ObjectId } from "mongodb";
// import merge from "lodash-es/merge";
import { notFound } from "next/navigation";

type AdminServerProps = {
  context: {
    params: Promise<{ type: string; id?: string }>;
  };
  config: ServerConfig;
  children: ReactNode;
};

export default async function AdminServer({
  context: { params },
  config,
  children,
}: AdminServerProps) {
  const { type, id } = await params;

  if (id && id !== "new" && !ObjectId.isValid(id)) {
    notFound();
  }
  const isNew = id === "new";

  const thrupple = config.find(([t]) => t === type);
  if (!thrupple) {
    notFound();
  }

  // const admin = thrupple[2] ? merge({}, thrupple[1], thrupple[2]) : thrupple[1];

  return (
    <div>
      <ServerProvider type={type} id={isNew ? null : id} isNew={isNew}>
        {children}
      </ServerProvider>
    </div>
  );
}
