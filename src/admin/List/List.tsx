"use client";
import { Fragment, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminList, type AdminListQueryData } from "./context";

import Notice from "@kenstack/components/Notice";
import { Skeleton } from "@kenstack/components/Skeleton";
import {
  SortableHandle,
  SortableItem,
  SortableList,
} from "@kenstack/components/SortableList";
import { Checkbox } from "@kenstack/forms/controls/Checkbox";
import ListTitle from "@kenstack/admin/components/ListTitle";
import Updated from "@kenstack/admin/components/Updated";
import VisibilityStatus from "./VisibilityStatus";
import type { AdminClient, BaseListItem } from "@kenstack/admin/client";
import type { SelectedMedia } from "@kenstack/db/queries";
import fetcher from "@kenstack/api/fetcher";
import { cn } from "@kenstack/lib/utils";

type ListItems = NonNullable<AdminClient["listItems"]>;

export default function AdminListWrapper() {
  return (
    <div className="border-t border-b border-y-[var(--admin-divider)]">
      <AdminList />
    </div>
  );
}

function AdminList() {
  const searchParams = useSearchParams();
  const {
    selected,
    setSelected,
    query,
    queryKey,
    apiPath,
    canReorder,
    isReorderSort,
    name,
    filters,
    sort,
    client: { listItems },
  } = useAdminList();
  const [reorderError, setReorderError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, error, isFetching, isPending, isPlaceholderData } = query;
  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) =>
      fetcher(apiPath, {
        action: "reorder",
        name,
        ids,
      }),
    onMutate: () => {
      setReorderError(null);
    },
    onError: (err) => {
      setReorderError(
        err instanceof Error ? err.message : "Unable to reorder.",
      );
      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (result) => {
      if (result.status === "success") {
        setReorderError(null);
      } else {
        setReorderError(result.message ?? "Unable to reorder.");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-list", name] });
    },
  });
  if (error) {
    return <Notice className="my-2">{error.message}</Notice>;
  }

  if (isPending) {
    return <AdminListRowsSkeleton />;
  }

  if ("error" === data.status) {
    return <Notice className="my-2">{data.message}</Notice>;
  }

  if (data.items.length === 0) {
    return <div className="py-2">No results</div>;
  }

  const resolvedListItems = listItems?.length
    ? listItems
    : buildDefaultListItems(data.items);
  const canDragReorder =
    canReorder &&
    data.items.length === data.total &&
    !isFetching &&
    !isPlaceholderData &&
    !reorderMutation.isPending;
  const group = isPlaceholderData
    ? undefined
    : sort.find(({ name }) => name === filters.sort)?.group;
  const listStyle: CSSProperties & {
    "--list-item-columns": string;
    "--list-item-mobile-columns": string;
  } = {
    "--list-item-columns": resolvedListItems
      .map(([, options]) => options?.column ?? "minmax(0,1fr)")
      .join(" "),
    "--list-item-mobile-columns": resolvedListItems
      .map(
        ([, options]) =>
          options?.mobileColumn ?? options?.column ?? "minmax(0,1fr)",
      )
      .join(" "),
  };
  // Consecutive rows sharing a group value form one section. Each section
  // reorders on its own so a row cannot be dragged into another group's
  // sequence.
  const sections: {
    rows: typeof data.items;
    start: number;
    value: number | string | null;
  }[] = [];
  data.items.forEach((item, index) => {
    const value = group ? groupValue(item, group.by) : null;
    const section = sections.at(-1);

    if (section && section.value === value) {
      section.rows.push(item);
    } else {
      sections.push({ rows: [item], start: index, value });
    }
  });
  return (
    <>
      {reorderError ? <Notice className="my-2">{reorderError}</Notice> : null}
      <div
        className="grid [grid-template-columns:min-content_var(--list-item-mobile-columns)] gap-x-2 pb-2 md:[grid-template-columns:min-content_var(--list-item-columns)]"
        style={listStyle}
      >
        {sections.map(({ rows, start, value }) => {
          const rowElements = rows.map((item, index) => {
            const path =
              `/admin/${name}/${item.id}` +
              (searchParams.size ? "?" + searchParams : "");
            const rowClassName = cn(
              "col-span-full grid grid-cols-subgrid",
              start + index < data.items.length - 1 &&
                "border-b border-b-[var(--admin-divider)]",
            );
            const cells = (
              <>
                <div className="flex items-center justify-self-start px-1 py-2">
                  {isReorderSort ? (
                    <SortableHandle />
                  ) : (
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
                  )}
                </div>
                <ListItemCells
                  item={{ ...item, path }}
                  listItems={resolvedListItems}
                  grouped={value !== null}
                />
              </>
            );

            return isReorderSort ? (
              <SortableItem
                className={rowClassName}
                disabled={!canDragReorder}
                id={String(item.id)}
                key={item.id}
              >
                {cells}
              </SortableItem>
            ) : (
              <div className={rowClassName} key={item.id}>
                {cells}
              </div>
            );
          });

          return (
            <Fragment key={start}>
              {group && value !== null ? (
                <GroupHeading
                  id={value}
                  label={groupValue(rows[0], group.label) ?? value}
                  link={group.link}
                />
              ) : null}
              {isReorderSort ? (
                <SortableList
                  activator="handle"
                  ids={rows.map(({ id }) => String(id))}
                  onMove={(from, to) => {
                    const moved = arrayMove(rows, from, to);

                    queryClient.setQueryData<AdminListQueryData>(
                      queryKey,
                      () => ({
                        ...data,
                        items: [
                          ...data.items.slice(0, start),
                          ...moved,
                          ...data.items.slice(start + moved.length),
                        ],
                      }),
                    );
                    reorderMutation.mutate(moved.map(({ id }) => id));
                  }}
                >
                  <div className="col-span-full grid grid-cols-subgrid">
                    {rowElements}
                  </div>
                </SortableList>
              ) : (
                rowElements
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

function groupValue(row: Record<string, unknown>, property: string) {
  const value = row[property];

  return typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
    ? value
    : null;
}

function GroupHeading({
  id,
  label,
  link,
}: {
  id: number | string;
  label: number | string;
  link?: string;
}) {
  return (
    <h2 className="col-span-full px-1 pt-4 pb-1 text-lg font-medium first:pt-2 md:px-2">
      {link && typeof id === "number" && Number.isInteger(id) && id > 0 ? (
        <Link
          className="hover:text-muted-foreground transition-colors"
          href={`/admin/${link}/${id}`}
        >
          {label}
        </Link>
      ) : (
        label
      )}
    </h2>
  );
}

function AdminListRowsSkeleton() {
  return (
    <div className="divide-border/50 divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
        >
          <Skeleton className="size-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-5 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

function buildDefaultListItems(
  items: (BaseListItem & Record<string, unknown>)[],
): ListItems {
  return [
    [(row) => <DefaultTitleCell row={row} />],
    ...(items.some((item) => typeof item.visibility === "string")
      ? ([
          [
            (row) => <VisibilityStatus item={row} />,
            { className: "flex items-center justify-end", column: "auto" },
          ],
        ] satisfies ListItems)
      : []),
  ];
}

function ListItemCells({
  grouped,
  item,
  listItems,
}: {
  grouped: boolean;
  item: BaseListItem & Record<string, unknown> & { path: string };
  listItems: ListItems;
}) {
  return listItems.map(([render, options], key) => {
    return (
      <div
        key={key}
        className={cn("min-w-0 py-2 md:px-2", options?.className)}
        style={{ gridColumn: key + 2 }}
      >
        {render(item, { grouped })}
      </div>
    );
  });
}

function DefaultTitleCell({
  row,
}: {
  row: BaseListItem & Record<string, unknown> & { path: string };
}) {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const media = Object.values(row).find(isSelectedMedia);
  const hasImageSlot = media || "image" in row;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {hasImageSlot ? <ImageCell media={media} path={row.path} /> : null}
      <ListTitle path={row.path} title={title || `ID ${row.id}`}>
        <Updated value={row.updatedAt} />
      </ListTitle>
    </div>
  );
}

function ImageCell({
  media,
  path,
}: {
  media: SelectedMedia | undefined;
  path: string;
}) {
  return (
    <div className="flex items-center">
      <Link
        className={cn(
          "relative size-10 shrink-0 overflow-hidden rounded ring-1",
          media
            ? "ring-border bg-transparent"
            : "border-border border border-dashed bg-transparent ring-transparent",
        )}
        href={path}
      >
        {media ? (
          <Image
            src={media.url}
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

function isSelectedMedia(value: unknown): value is SelectedMedia {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string"
  );
}
