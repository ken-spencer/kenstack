import { Suspense } from "react";
import Loading from "./Progress";

export default function SuspenseWrapper({ children }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
