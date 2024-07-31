"use client";

import dynamic from "next/dynamic";
import Loading from "../../admin/Loading";

import Field from "@admin/forms/Field";
import useField from "@admin/forms/useField";

const Editor = dynamic(() => import("./App"), {
  ssr: false,
  loading: Loading,
});

export default function EditorField(props) {
  const field = useField(props);
  return (
    <Field field={field}>
      <input {...field.props} value={field.value} type="hidden" />
      <Editor field={field} />
    </Field>
  );
}
