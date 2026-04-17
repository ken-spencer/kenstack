export type IconOption = [
  key: string,
  label: string,
  meta: {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    description?: string;
  },
];

import {
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";

export type AnyField = ControllerRenderProps<FieldValues, Path<FieldValues>>;

export type IconOptions = IconOption[];

// import { type FetchResult } from "@kenstack/lib/fetcher";
// import type { MutationFn } from "@kenstack/forms/context";
// export type WithExtra<TResult> = TResult & { values: Record<string, unknown> };
// export type MutationFunction<TResult, TVariables> = MutationFn<
//   FetchResult<WithExtra<TResult>>,
//   TVariables
// >;
