"use client";
import {
  Fragment,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GripVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminList, type AdminListQueryData } from "./context";

import Notice from "@kenstack/components/Notice";
import Button from "@kenstack/components/Button";
import { Skeleton } from "@kenstack/components/Skeleton";
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
  const draggedId = useRef<number | null>(null);
  const draggedScope = useRef<{ by: string; value: number | string } | null>(
    null,
  );
  const dragStartOrder = useRef<number[]>([]);
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
  const getQueryOrder = (
    scope: { by: string; value: number | string } | null,
  ) => {
    const current = queryClient.getQueryData<AdminListQueryData>(queryKey);
    return current?.status === "success"
      ? current.items
          .filter((row) => !scope || groupValue(row, scope.by) === scope.value)
          .map((row) => row.id)
      : [];
  };
  const reorderToTarget = (targetId: number) => {
    const sourceId = draggedId.current;
    if (sourceId === null || sourceId === targetId) {
      return;
    }

    const current = queryClient.getQueryData<AdminListQueryData>(queryKey);
    if (!current || current.status === "error") {
      return;
    }

    const sourceIndex = current.items.findIndex((row) => row.id === sourceId);
    const targetIndex = current.items.findIndex((row) => row.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    const scope = draggedScope.current;
    if (
      scope &&
      (groupValue(current.items[sourceIndex], scope.by) !== scope.value ||
        groupValue(current.items[targetIndex], scope.by) !== scope.value)
    ) {
      return;
    }

    const nextItems = [...current.items];
    nextItems[sourceIndex] = current.items[targetIndex];
    nextItems[targetIndex] = current.items[sourceIndex];

    queryClient.setQueryData<AdminListQueryData>(queryKey, () => ({
      ...current,
      items: nextItems,
    }));
  };

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
  const finishReorderDrag = () => {
    const startedWith = dragStartOrder.current;
    const currentIds = getQueryOrder(draggedScope.current);
    draggedId.current = null;
    draggedScope.current = null;
    dragStartOrder.current = [];

    if (
      startedWith.length === currentIds.length &&
      currentIds.some((id, index) => id !== startedWith[index])
    ) {
      reorderMutation.mutate(currentIds);
    }
  };
  const handleReorderDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (draggedId.current === null) {
      return;
    }

    const targetId = findReorderTargetId(event.target);
    const previousTargetId = findReorderTargetId(event.relatedTarget);

    if (targetId === null || previousTargetId === targetId) {
      return;
    }

    reorderToTarget(targetId);
  };
  const handleReorderDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (draggedId.current === null) {
      return;
    }

    if (findReorderTargetId(event.target) === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <>
      {reorderError ? <Notice className="my-2">{reorderError}</Notice> : null}
      <div
        className="grid [grid-template-columns:min-content_var(--list-item-mobile-columns)] gap-x-2 md:[grid-template-columns:min-content_var(--list-item-columns)]"
        onDragEnter={isReorderSort ? handleReorderDragEnter : undefined}
        onDragOver={isReorderSort ? handleReorderDragOver : undefined}
        onDrop={
          isReorderSort
            ? (event) => {
                event.preventDefault();
                finishReorderDrag();
              }
            : undefined
        }
        style={listStyle}
      >
        {data.items.map((item, key) => {
          const value = group ? groupValue(item, group.by) : null;
          const previous =
            group && key > 0 ? groupValue(data.items[key - 1], group.by) : null;
          const path =
            `/admin/${name}/${item.id}` +
            (searchParams.size ? "?" + searchParams : "");

          return (
            <Fragment key={item.id}>
              {group && value !== null && (key === 0 || value !== previous) ? (
                <GroupHeading
                  id={value}
                  label={groupValue(item, group.label) ?? value}
                  link={group.link}
                />
              ) : null}
              <div
                className="flex items-center justify-self-start px-1 py-2"
                data-reorder-id={isReorderSort ? item.id : undefined}
              >
                {isReorderSort ? (
                  <ReorderHandle
                    disabled={!canDragReorder}
                    itemId={item.id}
                    onDragStart={() => {
                      draggedId.current = item.id;
                      draggedScope.current =
                        group && value !== null
                          ? { by: group.by, value }
                          : null;
                      dragStartOrder.current = getQueryOrder(
                        draggedScope.current,
                      );
                    }}
                    onDragEnd={finishReorderDrag}
                  />
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
                reorderId={isReorderSort ? item.id : undefined}
                grouped={value !== null}
              />
              {data.items.length > key + 1 ? (
                <div className="col-span-full border-t border-t-[var(--admin-divider)]" />
              ) : (
                <div className="col-span-full mt-2" />
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

function ReorderHandle({
  disabled,
  itemId,
  onDragEnd,
  onDragStart,
}: {
  disabled: boolean;
  itemId: number;
  onDragEnd: () => void;
  onDragStart: () => void;
}) {
  return (
    <Button
      aria-label="Drag to reorder"
      className="!cursor-grab touch-none active:!cursor-grabbing"
      data-reorder-id={itemId}
      disabled={disabled}
      draggable={!disabled}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(itemId));
        onDragStart();
      }}
      size="icon-xs"
      type="button"
      variant="ghost"
    >
      <GripVertical className="text-muted-foreground size-4" />
    </Button>
  );
}

function findReorderTargetId(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const id = Number(
    target.closest<HTMLElement>("[data-reorder-id]")?.dataset.reorderId,
  );

  return Number.isInteger(id) ? id : null;
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
  reorderId,
}: {
  grouped: boolean;
  item: BaseListItem & Record<string, unknown> & { path: string };
  listItems: ListItems;
  reorderId?: number;
}) {
  return listItems.map(([render, options], key) => {
    return (
      <div
        key={key}
        className={cn("min-w-0 py-2 md:px-2", options?.className)}
        data-reorder-id={reorderId}
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
