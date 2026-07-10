import type React from "react";
import type { pageEditorFields } from "./fields";

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

type EditableTextFieldKind = "text" | "textarea" | "markdown";

export type Name = {
  [K in keyof typeof pageEditorFields]: (typeof pageEditorFields)[K]["kind"] extends EditableTextFieldKind
    ? K
    : never;
}[keyof typeof pageEditorFields];

export type ComponentProps<T extends BlockTag> = {
  tag?: T;
  content?: string;
  placeholder?: string;
} & React.ComponentProps<T>;

export type PageEditorProps<T extends BlockTag = "div"> = {
  name: Name;
  tag?: T;
  placeholder?: string;
} & React.ComponentProps<T>;

export type PageEditorAdminProps = {
  name: Name;
  placeholder?: string;
  className?: string;
};

export type EditorWrapperProps<T extends BlockTag = "div"> = {
  name: Name;
  tag: T;
  Component: React.ComponentType<ComponentProps<T>>;
  componentProps: React.ComponentProps<T>;
  placeholder?: string;
};

export type PageEditorLoader = () => Promise<{
  default: React.ComponentType<EditorWrapperProps>;
}>;
