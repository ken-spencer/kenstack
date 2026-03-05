import { useState } from "react";

import { makeEditorWrapper } from "../wrapper/makeEditorWrapper";
import { type PageEditorAdminProps } from "../types";

import Field from "@kenstack/forms/Field";
import { type ControllerRenderProps } from "react-hook-form";

import { MilkdownProvider, Milkdown, useEditor } from "@milkdown/react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
} from "@milkdown/kit/core";
import { gfm } from "@milkdown/kit/preset/gfm";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { getMarkdown } from "@milkdown/kit/utils";
import {
  placeholder as placeholderPlugin,
  placeholderCtx,
} from "milkdown-plugin-placeholder";

import { history } from "@milkdown/kit/plugin/history";

import "@milkdown/kit/prose/view/style/prosemirror.css";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";

import { Toolbar } from "./Toolbar";
import { usePageEditor, useCommit } from "../context";

type MilkdownEditorProps = {
  setFocused: React.Dispatch<React.SetStateAction<boolean>>;
} & PageEditorAdminProps;

const MilkdownEditorField = ({
  name,
  className,
  placeholder,
}: PageEditorAdminProps) => {
  return (
    <Field
      name={name}
      label={null}
      render={({ field }) => (
        <MilkdownEditorWrapper
          field={field}
          className={className}
          placeholder={placeholder}
          name={name}
        />
      )}
    />
  );
};

export const MilkdownEditorWrapper: React.FC<
  PageEditorAdminProps & { field: ControllerRenderProps }
> = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <MilkdownProvider>
        {focused && <Toolbar />}
        <MilkdownEditor setFocused={setFocused} {...props} />
      </MilkdownProvider>
    </div>
  );
};

const MilkdownEditor: React.FC<
  MilkdownEditorProps & { field: ControllerRenderProps }
> = ({ setFocused, name, field }) => {
  const { content } = usePageEditor();
  const commit = useCommit();
  useEditor((root) =>
    Editor.make()
      // .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content[name]);
        ctx.set(placeholderCtx, "Start typing…");
        ctx.get(listenerCtx).mounted(() => {
          ctx.get(editorViewCtx).focus();
        });

        ctx.get(listenerCtx).blur(() => {
          const md = getMarkdown()(ctx);
          field.onChange(md);
          field.onBlur();
          commit(name);
        });

        ctx.get(listenerCtx).focus(() => setFocused(true));
        ctx.get(listenerCtx).blur(() => setFocused(false));
      })
      .use(listener)
      .use(history)
      .use(placeholderPlugin)
      .use(commonmark)
      .use(gfm)
  );

  return <Milkdown />;
};

const MarkdownAdmin = makeEditorWrapper(MilkdownEditorField);
export default MarkdownAdmin;
