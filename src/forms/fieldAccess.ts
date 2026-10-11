"use client";

import { createContext, useContext } from "react";

import type { loadFieldAccess } from "@kenstack/admin/lib/fieldAccess";

// The fields the admin editor hides or locks for the person's roles, by name; the editor provides it,
// and every other form has none.
export const FieldAccessContext = createContext<
  Awaited<ReturnType<typeof loadFieldAccess>>
>({});

// How the admin editor shows a field the person's roles restrict; undefined for any other field.
export function useFieldAccess(name: string) {
  return useContext(FieldAccessContext)[name];
}
