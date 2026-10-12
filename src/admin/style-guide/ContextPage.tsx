import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as z from "zod";

import "@kenstack/admin/theme.css";
import StyleGuide, {
  contextLabels,
  type StyleGuideContext,
} from "./StyleGuide";
import "./theme.css";
import { pageRoute } from "@kenstack/pageRoute";
import { Skeleton } from "@kenstack/components/Skeleton";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

export default pageRoute(
  {
    access: process.env.NODE_ENV === "development" ? "admin" : undefined,
    fallback: (
      <div aria-busy="true" className="style-guide style-guide-theme-base">
        <p className="sr-only">Loading style guide</p>
        <Skeleton className="h-svh w-full" />
      </div>
    ),
    params: z.object({
      context: z.custom<StyleGuideContext>(
        (value) =>
          typeof value === "string" && Object.hasOwn(contextLabels, value),
      ),
    }),
  },
  ({ params }) => {
    if (process.env.NODE_ENV !== "development") {
      notFound();
    }

    return <StyleGuide context={params.context} />;
  },
);
