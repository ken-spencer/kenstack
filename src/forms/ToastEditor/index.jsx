"use client";

import dynamic from "next/dynamic";
import Loading from "@kenstack/components/Loading";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

const ToastEditor = dynamic(() => import("./ToastEditor"), {
  ssr: false,
  loading: Loading,
});

import { useTheme } from "next-themes";

export default function ToastEditorWrapper(props) {
  const { theme } = useTheme();
  // use key to destroy the editor on theme change. Otherwise not applie
  return <ToastEditor key={theme} {...props} />;
}
