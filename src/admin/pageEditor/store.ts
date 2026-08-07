"use client";

import type React from "react";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { Content } from "./loadContent";
import type { PageEditorFieldName } from "./fields";

export type PageEditorInit = {
  slug: string;
  tenant?: string;
  content: Content;
};

export type PageEditorStore = {
  scope: string | null;
  slug: string | null;
  tenant?: string;
  content: Content | null;
  editing: PageEditorFieldName | null;
  init: (input: PageEditorInit) => void;
  reset: (scope: string) => void;
  setContent: React.Dispatch<React.SetStateAction<Content>>;
  setEditing: React.Dispatch<React.SetStateAction<PageEditorFieldName | null>>;
};

export type PageEditorStoreApi = StoreApi<PageEditorStore>;

export function getPageEditorScope(slug: string, tenant?: string) {
  return `${tenant ?? ""}:${slug}`;
}

export function createPageEditorStore(input: PageEditorInit) {
  return createStore<PageEditorStore>((set) => ({
    scope: getPageEditorScope(input.slug, input.tenant),
    slug: input.slug,
    tenant: input.tenant,
    content: input.content,
    editing: null,

    init: ({ slug, tenant, content }) => {
      set({
        scope: getPageEditorScope(slug, tenant),
        slug,
        tenant,
        content,
        editing: null,
      });
    },

    reset: (scope) => {
      set((state) =>
        state.scope === scope
          ? {
              scope: null,
              slug: null,
              tenant: undefined,
              content: null,
              editing: null,
            }
          : {},
      );
    },

    setContent: (value) => {
      set((state) => {
        if (!state.content) {
          return {};
        }

        return {
          content: typeof value === "function" ? value(state.content) : value,
        };
      });
    },

    setEditing: (value) => {
      set((state) => ({
        editing: typeof value === "function" ? value(state.editing) : value,
      }));
    },
  }));
}
