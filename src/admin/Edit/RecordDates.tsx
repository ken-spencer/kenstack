"use client";

/*
 * Public entry point: the record's created and updated dates, for an EditFooter. Exports only
 * RecordDates.
 */

import { useWatch } from "react-hook-form";

import MetaDates from "../components/MetaDates";
import { useAdminEdit } from "./context";

export default function RecordDates() {
  const { item } = useAdminEdit();
  // The form's values carry the record's token, which moves on with each save.
  const updatedAt = useWatch({ name: "updatedAt" });
  return item ? <MetaDates record={{ ...item, updatedAt }} /> : null;
}
