"use client";

import "@toast-ui/editor/dist/toastui-editor.css";

import Progress from "@kenstack/components/Progress";
import dynamic from "next/dynamic";
const MarkdownField = dynamic(() => import("./MarkdownField"), {
  ssr: false,
  loading: () => <Progress />,
});

export default function MarkdownFieldCont(props) {
  return <MarkdownField {...props} />;
}
