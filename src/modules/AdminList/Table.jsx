"use client";

import { useAdminList } from "./context";
import Error from "@kenstack/components/Error";

import Loading from "@kenstack/components/Loading";

import Head from "./Head";
import Body from "./Body";

export default function AdminListTable() {
  const { error, isLoading, admin } = useAdminList();

  if (error) {
    return <Error message={error} />;
  }

  const list = admin.getList();
  const gridTemplateColumns =
    "auto " + list.map(({ width = "1fr" }) => width).join(" ");

  return (
    <>
      <div className="admin-table" style={{ gridTemplateColumns }}>
        <Head />
        <Body />
        {isLoading ? (
          <div className="col-span-full">
            <Loading />
          </div>
        ) : null}
      </div>
    </>
  );
}
