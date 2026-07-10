"use client";

import React, { Suspense } from "react";
import { useAdminUi } from "@kenstack/admin/components/PageControls/useAdminUi";
import { usePageEditor } from "@kenstack/admin/pageEditor/context";

import type {
  PageEditorProps,
  PageEditorLoader,
  ComponentProps,
  BlockTag,
} from "../types";

type Props = {
  component: React.ComponentType<ComponentProps<BlockTag>>;
  editor: PageEditorLoader;
};

type PolymorphicEditorComponent = <TTag extends BlockTag>(
  props: PageEditorProps<TTag>,
) => React.ReactElement | null;

type EditorWrapperProps<TTag extends BlockTag> = {
  name: PageEditorProps<TTag>["name"];
  tag: TTag;
  Component: React.ComponentType<ComponentProps<TTag>>;
  componentProps: Omit<
    PageEditorProps<TTag>,
    "name" | "tag" | "placeholder" | "content"
  >;
  placeholder?: string;
};

export default function createEditor({ component: Component, editor }: Props) {
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

    const tagProp = tag ?? ("div" as Tag);
    const ComponentForTag = Component as React.ComponentType<
      ComponentProps<Tag>
    >;
    const componentProps = props as ComponentProps<Tag>;

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
