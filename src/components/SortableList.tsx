"use client";

import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { twMerge } from "tailwind-merge";

/*
 * Shared pointer-based reordering for admin lists: the dragged item follows
 * the pointer while its neighbours animate aside to open the drop gap.
 * Wrap the collection in SortableList and each entry in SortableItem; the
 * entries render inside whatever list markup the caller owns.
 */
export function SortableList({
  children,
  ids,
  layout = "vertical",
  onMove,
}: {
  children: ReactNode;
  ids: string[];
  layout?: "grid" | "vertical";
  onMove: (from: number, to: number) => void;
}) {
  // The distance threshold keeps ordinary clicks on items and their inner
  // controls from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));

    if (from >= 0 && to >= 0) {
      onMove(from, to);
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  children,
  className,
  disabled = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  id: string;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled, id });

  return (
    <div
      className={twMerge(
        "touch-none",
        isDragging && "z-10 opacity-80 shadow-lg",
        className,
      )}
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
