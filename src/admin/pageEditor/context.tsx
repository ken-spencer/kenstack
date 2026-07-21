"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useStore } from "zustand";
import { useForm } from "@kenstack/forms/context";
import {
  useAdminControl,
  useAdminUi,
} from "@kenstack/admin/components/PageControls/useAdminUi";
import { getDisplayValues } from "@kenstack/fields/display";

import { type Content } from "./loadContent";
import { pageEditorFields } from "./fields";
import { type Name } from "./types";
import {
  createPageEditorStore,
  type PageEditorStore,
  type PageEditorStoreApi,
} from "./store";

type Context = {
  content: Content;
  slug: string;
  setContent: React.Dispatch<React.SetStateAction<Content>>;
  tenant?: string;
  editing: Name | null;
  setEditing: React.Dispatch<React.SetStateAction<Name | null>>;
};

type PageContentProviderProps = {
  slug: string;
  tenant?: string;
  content: Content;
  children: ReactNode;
};

const PageEditorStoreContext = createContext<PageEditorStoreApi | null>(null);
const FloatingError = dynamic(
  () => import("@kenstack/components/FloatingError"),
  {
    ssr: false,
  },
);

export function PageEditorProvider({
  children,
  content,
  slug,
  tenant,
}: PageContentProviderProps) {
  useAdminControl();
  const [store] = useState(() =>
    createPageEditorStore({ slug, tenant, content }),
  );

  useEffect(() => {
    store.getState().init({ slug, tenant, content });
  }, [store, slug, tenant, content]);

  return (
    <PageEditorStoreContext.Provider value={store}>
      {children}
      <PageEditorError />
    </PageEditorStoreContext.Provider>
  );
}

function PageEditorError() {
  const { pageEditorError, setPageEditorError } = useAdminUi();

  if (!pageEditorError) {
    return null;
  }

  return (
    <FloatingError
      message={pageEditorError}
      onDismiss={() => {
        setPageEditorError(null);
      }}
    />
  );
}

export function usePageEditor() {
  const store = useContext(PageEditorStoreContext);

  if (!store) {
    throw new Error(
      "usePageEditor must be used within the PageEditor component",
    );
  }

  const content = useStore(store, (state: PageEditorStore) => state.content);
  const editing = useStore(store, (state: PageEditorStore) => state.editing);
  const setContent = useStore(
    store,
    (state: PageEditorStore) => state.setContent,
  );
  const setEditing = useStore(
    store,
    (state: PageEditorStore) => state.setEditing,
  );
  const slug = useStore(store, (state: PageEditorStore) => state.slug);
  const tenant = useStore(store, (state: PageEditorStore) => state.tenant);

  if (!content || !slug) {
    throw new Error(
      "usePageEditor must be used within the PageEditor component",
    );
  }

  return {
    content,
    slug,
    tenant,
    editing,
    setContent,
    setEditing,
  } satisfies Context;
}

export const useCommit = () => {
  const router = useRouter();
  const { slug, content, setContent } = usePageEditor();
  const { form, mutation } = useForm();
  const { setPageEditorError } = useAdminUi();
  return useCallback(
    async (name: Name) => {
      const value = form.getValues(name);
      if (value !== undefined && content.data[name] !== value) {
        const data = {
          ...content.data,
          [name]: value,
        };
        setContent({
          ...content,
          data,
          display: await getDisplayValues(pageEditorFields, data),
        });

        mutation
          .mutateAsync({
            slug,
            changes: [name],
            values: { [name]: value },
          })
          .then((res) => {
            if (res.status === "error") {
              setPageEditorError(
                res.message ??
                  "There was an unexpected problem saving this content.",
              );
              return;
            }

            setPageEditorError(null);
            router.refresh();
          })
          .catch(() => {
            setPageEditorError(
              "There was an unexpected problem saving this content.",
            );
          });
      }
    },
    [form, router, mutation, slug, content, setContent, setPageEditorError],
  );
};
