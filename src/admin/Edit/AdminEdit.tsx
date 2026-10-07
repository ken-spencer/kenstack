"use client";

/*
 * Public entry point: the record editor. A module's own Edit component renders it, passing its
 * toolbar, footer and fields as elements; Kenstack renders it with its defaults for every other
 * module. Exports only AdminEdit.
 */

import type { ReactNode } from "react";

import { useAdminEdit } from "./context";
import EditFooter from "./EditFooter";
import EditForm from "./Form";
import Header from "./Header";
import NeighborButtons from "./NeighborButtons";
import OneToOneTabs from "./OneToOneTabs";
import RecordDates from "./RecordDates";

export default function AdminEdit({
  toolbar = <Header />,
  footer = (
    <EditFooter>
      <RecordDates />
      <NeighborButtons />
    </EditFooter>
  ),
  children = <OneToOneTabs />,
}: {
  toolbar?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const { breadcrumbs, childModuleLinks } = useAdminEdit();
  return (
    <EditForm>
      <div className="flex flex-col gap-2">
        {breadcrumbs}
        {toolbar}
        {childModuleLinks}
        {children}
        {footer}
      </div>
    </EditForm>
  );
}
