import type React from "react";

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

// type BlockElementProps = {
//   [K in BlockTag]: { tag: K } & React.ComponentProps<K>;
// }[BlockTag];

export type Name =
  | "title"
  | "description"
  | "content"
  | "seoTitle"
  | "seoDescription";

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

// export type PageEditorInternalProps = {
//   name: Name;
//   placeholder?: string;
//   tag: BlockTag;
// } & React.ComponentProps<"div">;

export type PageEditorAdminProps = {
  name: Name;
  placeholder?: string;
  // value: string;
  // setValue: React.Dispatch<React.SetStateAction<string>>;
  // commit: (currentValue: string) => void;
  className?: string;
};

export type PageComponentLoader = () => Promise<{
  default: React.ComponentType<ComponentProps<"div">>;
}>;

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
