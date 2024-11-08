"use client";

import dynamic from "next/dynamic";
import Loading from "@kenstack/components/Loading";

import Field from "@kenstack/forms/Field";
import useField from "@kenstack/forms/useField";

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
