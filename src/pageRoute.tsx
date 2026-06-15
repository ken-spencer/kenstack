import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type * as z from "zod";

import { deps } from "@app/deps";
import type { UserAccess } from "@kenstack/auth/types";

type MaybeSchema = z.ZodType | undefined;
type SearchParams = Record<string, string | string[] | undefined>;
type SchemaValue<TSchema extends MaybeSchema> = TSchema extends z.ZodType
  ? z.output<TSchema>
  : undefined;
type RouteUser<TAccess> = [TAccess] extends [undefined]
  ? undefined
  : Awaited<ReturnType<typeof deps.auth.requireUser>>;

type PageRouteProps = {
  params?: Promise<SearchParams>;
  searchParams?: Promise<SearchParams>;
};

export function pageRoute<
  const TParams extends MaybeSchema = undefined,
  const TSearch extends MaybeSchema = undefined,
  const TAccess extends UserAccess | undefined = undefined,
>(
  options: {
    access?: TAccess;
    params?: TParams;
    search?: TSearch;
  },
  render: (context: {
    params: SchemaValue<TParams>;
    /** unsafe route params */
    paramsIn: SearchParams;
    search: SchemaValue<TSearch>;
    /** unsafe search params */
    searchIn: SearchParams;
    user: RouteUser<TAccess>;
  }) => ReactNode | Promise<ReactNode>,
) {
  return async function PageRoute({ params, searchParams }: PageRouteProps) {
    const [paramsIn = {}, searchIn = {}] = await Promise.all([
      params,
      searchParams,
    ]);

    const [parsedParams, parsedSearch] = await Promise.all([
      parseInput(options.params, paramsIn),
      parseInput(options.search, searchIn),
    ]);
    const user = options.access
      ? await deps.auth.requireUser(options.access)
      : undefined;

    const context = {
      params: parsedParams,
      paramsIn,
      search: parsedSearch,
      searchIn,
      user: user as RouteUser<TAccess>,
    };
    const PageContent = render;

    return <PageContent {...context} />;
  };
}

async function parseInput<TSchema extends MaybeSchema>(
  schema: TSchema | undefined,
  value: unknown,
): Promise<SchemaValue<TSchema>> {
  if (!schema) {
    return undefined as SchemaValue<TSchema>;
  }

  const parsed = await schema.safeParseAsync(value);
  if (parsed.success) {
    return parsed.data as SchemaValue<TSchema>;
  }

  notFound();
}
