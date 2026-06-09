"use client";

import {
  createContext,
  useState,
  useContext,
  useCallback,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import FloatingError from "@kenstack/components/FloatingError";
import { useForm } from "@kenstack/forms/context";
import {
  useAdminControl,
  useAdminUi,
} from "@kenstack/admin/components/PageControls/useAdminUi";
import { getDisplayValues } from "@kenstack/fields/display";

import { type Content } from "@kenstack/admin/pageEditor";
import { pageEditorFields } from "./fields";
import { type Name } from "./types";

type Context = {
  content: Content;
  slug: string;
  setContent: React.Dispatch<React.SetStateAction<Content>>;
  tenant?: string;
  editing: keyof Content["data"] | null;
  setEditing: React.Dispatch<
    React.SetStateAction<keyof Content["data"] | null>
  >;
};

type PageContentProviderProps = {
  slug: string;
  tenant?: string;
  content: Content;
  children: ReactNode;
};

const PageContentContext = createContext<Context | null>(null);

export function PageEditorProvider({
  children,
  content: defaultContent,
  ...value
}: PageContentProviderProps) {
  useAdminControl();
  const [editing, setEditing] = useState<keyof Content["data"] | null>(null);
  const [content, setContent] = useState(defaultContent);

  const context = {
    ...value,
    content,
    setContent,
    editing,
    setEditing,
  } satisfies Context;
  return (
    <PageContentContext.Provider value={context}>
      {children}
      <PageEditorError />
    </PageContentContext.Provider>
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
  const ctx = useContext(PageContentContext);

  if (!ctx) {
    throw new Error(
      "usePageEditor must be used within the PageEditor component",
    );
  }

  return ctx;
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
