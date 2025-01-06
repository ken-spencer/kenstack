"use client";

import dynamic from "next/dynamic";
// import Loading from "@kenstack/components/Loading";

const ListClient = dynamic(() => import("@kenstack/modules/AdminList"));
const EditClient = dynamic(() => import("@kenstack/modules/AdminEdit"));

import { useServer } from "@kenstack/server/context";

export default function AdminClient({ admin }) {
  const { list, edit } = useServer();

  if (list === true) {
    return <ListClient admin={admin} />;
  }

  if (edit === true) {
    return <EditClient admin={admin} />;
  }

  throw Error("no recognized client available.");
}
