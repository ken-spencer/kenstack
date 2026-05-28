"use client";
import { Fragment, type CSSProperties } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminList } from "./context";

import Progress from "@kenstack/components/Progress";
import Alert from "@kenstack/components/Alert";
import { Checkbox } from "@kenstack/components/ui/checkbox";
import MetaDates from "@kenstack/admin/components/MetaDates";
import VisibilityStatus from "./VisibilityStatus";
import type { AdminClient, BaseListItem } from "@kenstack/admin/client";
import type { SelectedImage } from "@kenstack/db/tables";
import { cn } from "@kenstack/lib/utils";

type ListItems = NonNullable<AdminClient["listItems"]>;

export default function AdminListWrapper() {
  return (
    <div className="border-t border-b">
      <AdminList />
    </div>
  );
}

function AdminList() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    selected,
    setSelected,
    query,
    client: { listItems },
  } = useAdminList();

  const { data, error, isPending } = query;

  if (error) {
    return <Alert className="my-2">{error.message}</Alert>;
  }

  if (isPending) {
    return <Progress className="my-16" />;
  }

  if ("error" === data.status) {
    return <Alert className="my-2">{data.message}</Alert>;
  }

  if (data.items.length === 0) {
    return <div className="py-2">No results</div>;
  }

  const resolvedListItems = listItems?.length
    ? listItems
    : getDefaultListItems(data.items);
  const listStyle = {
    "--list-item-columns": resolvedListItems
      .map(([, options]) => options?.column ?? "minmax(0,1fr)")
      .join(" "),
  } as CSSProperties & { "--list-item-columns": string };

  return (
    <div
      className="grid [grid-template-columns:min-content_var(--list-item-columns)] gap-x-2"
      style={listStyle}
    >
      {data.items.map((item, key) => {
        const path =
          pathname +
          "/" +
          item.id +
          (searchParams.size ? "?" + searchParams : "");
        return (
          <Fragment key={item.id}>
            <div className="flex items-center justify-self-start px-1 py-2">
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={(checked) => {
                  return checked
                    ? setSelected([...selected, item.id])
                    : setSelected(
                        selected.filter((value) => value !== item.id),
                      );
                }}
              />
            </div>
            <ListItemCells
              item={{ ...item, path }}
              listItems={resolvedListItems}
            />
            {data.items.length > key + 1 ? (
              <div className="col-span-full border-t" />
            ) : (
              <div className="col-span-full mt-2" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function getDefaultListItems(
  items: (BaseListItem & Record<string, unknown>)[],
): ListItems {
  return [
    [(row) => <DefaultTitleCell row={row} />],
    ...(items.some((item) => typeof item.visibility === "string")
      ? ([
          [
            (row) => <VisibilityStatusCell row={row} />,
            { className: "flex justify-end", column: "auto" },
          ],
        ] satisfies ListItems)
      : []),
  ];
}

function ListItemCells({
  item,
  listItems,
}: {
  item: BaseListItem & Record<string, unknown> & { path: string };
  listItems: ListItems;
}) {
  return listItems.map(([render, options], key) => {
    return (
      <div
        key={key}
        className={cn("min-w-0 py-2 md:px-2", options?.className)}
      >
        {render(item)}
      </div>
    );
  });
}

function DefaultTitleCell({
  row,
}: {
  row: BaseListItem & Record<string, unknown> & { path: string };
}) {
  const title = getDefaultTitle(row);
  const image = getDefaultImage(row);
  const hasImageSlot = image || "image" in row;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {hasImageSlot ? <ImageCell image={image} path={row.path} /> : null}
      <div className="flex min-w-0 flex-col">
        <Link className="text-lg" href={row.path}>
          {title}
        </Link>
        <MetaDates createdAt={row.createdAt} updatedAt={row.updatedAt} />
      </div>
    </div>
  );
}

function VisibilityStatusCell({
  row,
}: {
  row: BaseListItem & Record<string, unknown>;
}) {
  return <VisibilityStatus item={row} />;
}

function ImageCell({
  image,
  path,
}: {
  image: SelectedImage | undefined;
  path: string;
}) {
  return (
    <div className="flex items-center">
      <Link
        className="relative size-10 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
        href={path}
      >
        {image ? (
          <Image
            src={image.url}
            alt=""
            fill
            className="object-contain p-1"
            sizes="40px"
          />
        ) : null}
      </Link>
    </div>
  );
}

function getDefaultTitle(item: BaseListItem & { title?: string | null }) {
  const title = item.title?.trim();
  return title || `ID ${item.id}`;
}

function getDefaultImage(item: BaseListItem & Record<string, unknown>) {
  return Object.values(item).find(isSelectedImage);
}

function isSelectedImage(value: unknown): value is SelectedImage {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string"
  );
}
