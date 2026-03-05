"use client";

import React from "react";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";
import { usePageEditor } from "@kenstack/pageEditor/context";

import dynamic from "next/dynamic";
import type {
  PageEditorProps,
  PageEditorLoader,
  PageComponentLoader,
  ComponentProps,
  BlockTag,
} from "../types";

type Props =
  | {
      component: React.ComponentType<ComponentProps<"div">>;
      componentLoader?: never;
      editor: PageEditorLoader;
    }
  | {
      component?: never;
      componentLoader: PageComponentLoader;
      editor: PageEditorLoader;
    };

type PolymorphicEditorComponent = <TTag extends BlockTag>(
  props: PageEditorProps<TTag>
) => React.ReactElement | null;

type EditorWrapperProps<TTag extends BlockTag> = {
  name: PageEditorProps<TTag>["name"];
  tag: TTag;
  Component: React.ComponentType<unknown>;
  componentProps: Omit<
    PageEditorProps<TTag>,
    "name" | "tag" | "placeholder" | "content"
  >;
  placeholder?: string;
};

export default function createEditor({
  component,
  componentLoader,
  editor,
}: Props) {
  const PageEditor = dynamic(editor, {
    ssr: false,
  });
  const PageEditorAny = PageEditor as React.ComponentType<
    EditorWrapperProps<BlockTag>
  >;

  const Component = componentLoader ? dynamic(componentLoader) : component;
  const ComponentAny = Component as React.ComponentType<unknown>;

  const PageEditCont = function PageEditCont<Tag extends BlockTag>({
    tag,
    name,
    placeholder = "Enter Text",
    // content: _ignoredContent,
    ...props
  }: PageEditorProps<Tag>) {
    const { isEditingEnabled } = useAdminUi();
    const { content } = usePageEditor();
    const value = content[name] as string | undefined;

    const tagProp = tag ?? ("div" as Tag);

    if (isEditingEnabled()) {
      return (
        <PageEditorAny
          name={name}
          tag={tagProp}
          Component={ComponentAny}
          componentProps={props}
          placeholder={placeholder}
        />
      );
    }

    return (
      <ComponentAny
        tag={tagProp}
        {...props}
        placeholder={placeholder}
        content={value}
      />
    );
  };

  return PageEditCont as PolymorphicEditorComponent;
}
