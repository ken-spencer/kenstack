"use client";

import {
  createContext,
  useState,
  useContext,
  useCallback,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { useForm } from "@kenstack/forms/context";

import { type Content } from "@kenstack/pageEditor";
import { type Name } from "./types";

type EditingError = {
  name: Name;
  message: string;
};

type Context = {
  content: Content;
  slug: string;
  setContent: React.Dispatch<React.SetStateAction<Content>>;
  tenant?: string;
  editing: keyof Content | null;
  setEditing: React.Dispatch<React.SetStateAction<keyof Content | null>>;
  error: EditingError | null;
  setError: React.Dispatch<React.SetStateAction<EditingError | null>>;
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
  const [editing, setEditing] = useState<keyof Content | null>(null);
  const [content, setContent] = useState(defaultContent);
  const [error, setError] = useState<EditingError | null>(null);

  const context = {
    ...value,
    content,
    setContent,
    editing,
    setEditing,
    error,
    setError,
  } satisfies Context;
  return (
    <PageContentContext.Provider value={context}>
      {children}
    </PageContentContext.Provider>
  );
}

export function usePageEditor() {
  const ctx = useContext(PageContentContext);

  if (!ctx) {
    throw new Error(
      "usePageEditor must be used within the PageEditor component"
    );
  }

  return ctx;
}

export const useCommit = () => {
  const router = useRouter();
  const { slug, content, setContent } = usePageEditor();
  const { form, mutation } = useForm();
  return useCallback(
    (name: Name) => {
      const value = form.getValues(name);
      if (value !== undefined && content[name] !== value) {
        setContent({ ...content, [name]: value });
        mutation.mutateAsync({ slug, field: name, value }).then((res) => {
          if (res.status === "success") {
            router.refresh();
          }
        });
      }
    },
    [form, router, mutation, slug, content, setContent]
  );
};
