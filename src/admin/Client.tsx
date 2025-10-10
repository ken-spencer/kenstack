"use client";

import { useServer } from "@kenstack/admin/Server/context";
import merge from "lodash-es/merge";

import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";

import { type ClientConfig } from "@kenstack/admin/types";

type AdminClientProps = {
  config: ClientConfig;
};

export default function AdminClient({ config }: AdminClientProps) {
  const { type } = useServer();

  const [, base, overrides] = config.find(([t]) => t === type) || [];
  if (!base) {
    throw Error(`No admin client for ${type} found`);
  }
  const admin = merge({}, base, overrides);
  const Icon = admin.icon;

  return (
    <div>
      <div className="flex justify-center items-center gap-4 mx-auto text-gray-700 text-md mb-2">
        {Icon && <Icon className="size-4 text-gray-800" />}{" "}
        <span className="font-bold">{admin.title}</span>
      </div>
      <AdminRoute admin={admin} />
    </div>
  );
}

function AdminRoute({ admin }) {
  const { id, isNew } = useServer();

  return isNew || id ? (
    <Edit adminConfig={admin} />
  ) : (
    <AdminList admin={admin} />
  );
}
