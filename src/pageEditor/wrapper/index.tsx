"use client";

import React, { Suspense } from "react";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";
import { usePageEditor } from "@kenstack/pageEditor/context";

// import dynamic from "next/dynamic";
import type {
  PageEditorProps,
  PageEditorLoader,
  // PageComponentLoader,
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

export default function createEditor({
  component: Component,
  // componentLoader,
  editor,
}: Props) {
  const PageEditor = React.lazy(editor) as React.ComponentType<
    EditorWrapperProps<BlockTag>
  >;
  // const PageEditor = dynamic(editor, {
  //   ssr: false,
  //   loading: () => <div className="h-13 bg-red-500"></div>,
  // });
  // const PageEditorAny = PageEditor as React.ComponentType<
  //   EditorWrapperProps<BlockTag>
  // >;

  // const Component = component; //componentLoader ? React.lazy(componentLoader) : component;

  const PageEditCont = function PageEditCont<Tag extends BlockTag>({
    tag,
    name,
    placeholder = "Enter Text",
    ...props
  }: PageEditorProps<Tag>) {
    const { isEditingEnabled } = useAdminUi();
    const { content } = usePageEditor();
    const value = content[name];
    const html = name === "content" ? content["contentHtml"] : null;

    const tagProp = tag ?? ("div" as Tag);
    const ComponentForTag = Component as React.ComponentType<
      ComponentProps<Tag>
    >;
    const componentProps = props as ComponentProps<Tag>;

    if (isEditingEnabled()) {
      return (
        <Suspense
          fallback={
            <ComponentForTag
              tag={tagProp}
              {...componentProps}
              content={html ?? value}
              placeholder={placeholder}
            />
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

    if (value) {
      return (
        <ComponentForTag
          tag={tagProp}
          {...componentProps}
          content={html ?? value}
        />
      );
    }
  };

  return PageEditCont as PolymorphicEditorComponent;
}
