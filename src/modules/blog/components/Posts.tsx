import Image from "next/image";
import NextLink from "next/link";
import { ArrowRight } from "lucide-react";

import { listBlogs } from "@kenstack/modules/blog/queries";

export default async function Posts({
  basePath,
  preview,
  tag,
}: {
  basePath: string;
  preview?: boolean;
  tag?: string;
}) {
  const posts = await listBlogs({ preview, tag });

  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground">
        No posts are currently published for this view.
      </p>
    );
  }

  return (
    <div className="grid max-w-6xl grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
      {posts.map(({ slug, title, description, publishedAt, image }) => {
        const searchParams = new URLSearchParams();
        if (tag) {
          searchParams.set("tag", tag);
        }

        if (preview) {
          searchParams.set("preview", "");
        }

        const query = searchParams.toString();
        const href = `${basePath}/${slug}${query ? `?${query}` : ""}`;
        const date = publishedAt?.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        return (
          <article
            className="group hover:bg-muted/40 flex h-full flex-col gap-3 rounded-md p-3 transition-colors"
            key={slug}
          >
            {image ? (
              <NextLink
                href={href}
                className="relative block aspect-square overflow-hidden rounded-md bg-gray-100"
              >
                <Image
                  src={image.url}
                  width={image.width ?? 800}
                  height={image.height ?? 800}
                  alt={image.alt ?? ""}
                  className="h-full w-full object-cover"
                  sizes="(min-width: 1024px) 288px, (min-width: 768px) 50vw, 100vw"
                  unoptimized={image.kind === "svg"}
                />
              </NextLink>
            ) : (
              <div className="aspect-square rounded-md bg-gray-100" />
            )}
            {publishedAt && (
              <time
                className="text-muted-foreground text-sm"
                dateTime={publishedAt.toISOString()}
              >
                {date}
              </time>
            )}
            <NextLink
              href={href}
              className="text-2xl leading-tight whitespace-normal"
            >
              {title}
            </NextLink>
            {description ? (
              <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                {description}
              </p>
            ) : null}
            <NextLink
              href={href}
              className="text-primary mt-auto inline-flex w-fit items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              Read post
              <ArrowRight className="size-4" />
            </NextLink>
          </article>
        );
      })}
    </div>
  );
}
