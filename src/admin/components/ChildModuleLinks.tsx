"use client";

import { useAdminEdit } from "../Edit/context";

export default function ChildModuleLinks() {
  const { childModuleLinks } = useAdminEdit();

  return childModuleLinks ?? null;
}
