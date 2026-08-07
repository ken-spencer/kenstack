"use client";

import React, { Suspense } from "react";
import { useAdminUi } from "@kenstack/admin/components/PageControls/useAdminUi";
import { usePageEditor } from "@kenstack/admin/pageEditor/context";
import type { PageEditorFieldName } from "@kenstack/admin/pageEditor/fields";

export type BlockTag =
  | "blockquote"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "li"
  | "p"
  | "div"
  | "pre";

export type PageEditorContentProps<T extends BlockTag> = {
  tag?: T;
  content?: string;
  placeholder?: string;
} & React.ComponentProps<T>;

export type PageEditorProps<T extends BlockTag = "div"> = T extends BlockTag
  ? {
      name: PageEditorFieldName;
      placeholder?: string;
    } & (T extends "div" ? { tag?: T } : { tag: T }) &
      React.ComponentProps<T>
  : never;

export type EditorWrapperProps<T extends BlockTag = "div"> = {
  name: PageEditorFieldName;
  tag: T;
  Component: React.ComponentType<PageEditorContentProps<T>>;
  componentProps: Omit<
    PageEditorProps<T>,
    "name" | "tag" | "placeholder" | "content"
  >;
  placeholder?: string;
};

type NonDivBlockTag = Exclude<BlockTag, "div">;

type PolymorphicEditorComponent = {
  (props: PageEditorProps<"div">): React.ReactElement | null;
  <TTag extends NonDivBlockTag>(
    props: PageEditorProps<TTag> & { tag: TTag },
  ): React.ReactElement | null;
};

export default function createEditor({
  component: Component,
  editor,
}: {
  component: React.ComponentType<PageEditorContentProps<BlockTag>>;
  editor: () => Promise<{
    default: React.ComponentType<EditorWrapperProps>;
  }>;
}) {
  const PageEditor = React.lazy(editor) as React.ComponentType<
    EditorWrapperProps<BlockTag>
  >;
  const PageEditCont = function PageEditCont<Tag extends BlockTag>({
    tag,
    name,
    placeholder = "Enter Text",
    ...props
  }: PageEditorProps<Tag>) {
    const { showAdminControls } = useAdminUi();
    const { content } = usePageEditor();
    const displayValue = content.display[name];

    // PageEditorProps permits an omitted tag only for the div variant.
    const tagProp = tag ?? ("div" as Tag);
    const ComponentForTag = Component as React.ComponentType<
      PageEditorContentProps<Tag>
    >;
    const componentProps = props as PageEditorContentProps<Tag>;

    if (showAdminControls) {
      return (
        <Suspense
          fallback={
            <EditorSkeleton>
              <ComponentForTag
                tag={tagProp}
                {...componentProps}
                content={displayValue}
                placeholder={placeholder}
              />
            </EditorSkeleton>
          }
        >
          <PageEditor
            name={name}
            tag={tagProp}
            Component={Component}
            componentProps={props}
            placeholder={placeholder}
          />
        </Suspense>
      );
    }

    if (content.data[name]) {
      return (
        <ComponentForTag
          tag={tagProp}
          {...componentProps}
          content={displayValue}
        />
      );
    }

    return null;
  };

  return PageEditCont as PolymorphicEditorComponent;
}

function EditorSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-7">
      {children}
      <span
        className="absolute -top-3 -right-6 size-6 rounded-full"
        aria-hidden="true"
      />
    </div>
  );
}
