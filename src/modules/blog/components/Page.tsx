import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Markdown from "@kenstack/components/Markdown";
import type { BlogModule } from "@kenstack/modules/blog";
import { getBlog } from "@kenstack/modules/blog/queries";

export type BlogPostProps = {
  module: BlogModule;
  slug: string;
  searchParams?: Record<string, unknown> | Promise<Record<string, unknown>>;
};

function getStringParam(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

export default async function BlogPost({
  module,
  slug,
  searchParams = {},
}: BlogPostProps) {
  const query = await searchParams;
  const preview = query.preview !== undefined;
  const tag = getStringParam(query.tag);
  const post = await getBlog(module.tables.tableName, slug, {
    preview,
    name: module.name,
    prefix: module.tables.prefix,
  });

  if (!post) {
    notFound();
  }

  const backHref = tag
    ? `${module.basePath}?tag=${encodeURIComponent(tag)}`
    : module.basePath;
  const hasContent = post.content.trim().length > 0;
  const publishedDate = post.publishedAt
    ? post.publishedAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <main className="mx-auto my-8 flex max-w-5xl flex-col gap-8 px-4">
      <article className="flex flex-col gap-8">
        <header className="flex max-w-4xl flex-col gap-4">
          <Link
            href={backHref}
            className="text-muted-foreground flex w-fit items-center gap-2 text-sm underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
          {publishedDate ? (
            <time
              className="text-muted-foreground text-sm"
              dateTime={post.publishedAt?.toISOString()}
            >
              {publishedDate}
            </time>
          ) : null}
          <h1 className="text-4xl leading-tight">{post.title}</h1>
          {post.description ? (
            <p className="text-muted-foreground text-lg leading-8">
              {post.description}
            </p>
          ) : null}
        </header>
        <div className="max-w-4xl">
          {post.image ? (
            <Image
              src={post.image.url}
              width={post.image.width ?? 800}
              height={post.image.height ?? 800}
              alt={post.image.alt || post.title}
              className={
                hasContent
                  ? "mb-6 aspect-square w-full rounded-md object-cover lg:float-right lg:ml-8 lg:w-96"
                  : "mb-6 aspect-square w-full rounded-md object-cover"
              }
              sizes="(min-width: 1024px) 384px, 100vw"
              unoptimized={post.image.kind === "svg"}
            />
          ) : null}
          {hasContent ? (
            <Markdown
              className="markdown text-justify"
              content={post.content}
            />
          ) : null}
        </div>
        <Tags basePath={module.basePath} tags={post.tags} />
      </article>
    </main>
  );
}

export function Tags({
  basePath,
  tags,
}: {
  basePath: string;
  tags: { name: string; slug: string }[];
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="clear-both flex max-w-4xl flex-wrap items-center gap-3 border-t pt-6">
      <span className="text-muted-foreground text-sm">Tagged</span>
      <div className="flex flex-wrap gap-2">
        {tags.map(({ name, slug }) => (
          <Link
            href={`${basePath}?tag=${encodeURIComponent(slug)}`}
            key={slug}
            className="rounded-full border px-3 py-1 text-sm font-normal"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}
