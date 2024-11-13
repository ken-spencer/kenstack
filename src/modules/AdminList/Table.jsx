"use client";

import { useAdminList } from "./context";
import Notice from "@kenstack/components/Notice";

import Loading from "@kenstack/components/Loading";

import Head from "./Head";
import Body from "./Body";

export default function AdminListTable() {
  const { error, isLoading, admin } = useAdminList();

  if (error) {
    return <Notice error={error} />;
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
