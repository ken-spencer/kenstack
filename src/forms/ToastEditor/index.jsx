"use client";

import dynamic from "next/dynamic";
import Loading from "@kenstack/components/Loading";

const ToastEditor = dynamic(() => import("./ToastEditor"), {
  ssr: false,
  loading: Loading,
});

export default function ToastEditorWrapper(props) {
  return <ToastEditor {...props} />;
}
