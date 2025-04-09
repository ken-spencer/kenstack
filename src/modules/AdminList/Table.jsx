"use client";

import { useAdminList } from "./context";

import AdminIcon from "@kenstack/components/AdminIcon";
import Loading from "@kenstack/components/Loading";
import RefreshIcon from "@kenstack/icons/Refresh";
import Head from "./Head";
import Body from "./Body";
import Notice from "@kenstack/components/Notice/Base";
import NoticeList from "@kenstack/components/Notice/List";

export default function AdminListTable() {
  const { error, refetch, isLoading, admin, messageStore } = useAdminList();
  if (error) {
    return (
      <Notice>
        <div className="flex items-center gap-2">
          {error}
          <AdminIcon type="button" tooltip="Retry" onClick={() => refetch()}>
            <RefreshIcon />
          </AdminIcon>
        </div>
      </Notice>
    );
  }

  const list = admin.getList();
  const gridTemplateColumns =
    "auto " + list.map(({ width = "1fr" }) => width).join(" ");

  return (
    <>
      <NoticeList store={messageStore} />
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
