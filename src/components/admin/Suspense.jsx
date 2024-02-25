import React from "react";
import Loading from "./Loading";

export default function Suspense({ children }) {
  return <React.Suspense fallback={<Loading />}>{children}</React.Suspense>;
}
