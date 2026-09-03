"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
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
import { GripVertical } from "lucide-react";
import { twMerge } from "tailwind-merge";

import Button from "./Button";

/*
 * Shared pointer-based reordering for admin lists: the dragged item follows
 * the pointer while its neighbours animate aside to open the drop gap.
 * Wrap the collection in SortableList and each entry in SortableItem; the
 * entries render inside whatever list markup the caller owns.
 *
 * With `activator="item"` the whole entry starts a drag: a mouse drags after
 * a short distance and a touch after a short hold, so touch scrolling over
 * the list still wins. With `activator="handle"` only a SortableHandle
 * rendered inside the entry starts a drag, after the same short distance for
 * every pointer type.
 */
type Activator = "handle" | "item";

const ActivatorContext = createContext<Activator>("item");

type Handle = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
> & { disabled: boolean };

const HandleContext = createContext<Handle | null>(null);

export function SortableList({
  activator = "item",
  children,
  ids,
  layout = "vertical",
  onMove,
}: {
  activator?: Activator;
  children: ReactNode;
  ids: string[];
  layout?: "grid" | "vertical";
  onMove: (from: number, to: number) => void;
}) {
  // The distance thresholds keep ordinary clicks on items and their inner
  // controls from starting a drag.
  const sensorsByActivator = {
    handle: useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    ),
    item: useSensors(
      useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
      useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 5 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    ),
  };

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
    // dnd-kit numbers its screen-reader instruction ids per mount, which
    // differs between the server render and hydration; a React id keeps the
    // aria-describedby stable across both.
    <DndContext
      collisionDetection={closestCenter}
      id={useId()}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
      sensors={sensorsByActivator[activator]}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        <ActivatorContext.Provider value={activator}>
          {children}
        </ActivatorContext.Provider>
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
  const activator = useContext(ActivatorContext);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled, id });

  return (
    <HandleContext.Provider
      value={{ attributes, disabled, listeners, setActivatorNodeRef }}
    >
      <div
        className={twMerge(
          isDragging && "z-10 opacity-80 shadow-lg",
          className,
        )}
        data-dragging={isDragging || undefined}
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...(activator === "item" ? { ...attributes, ...listeners } : null)}
      >
        {children}
      </div>
    </HandleContext.Provider>
  );
}

export function SortableHandle() {
  const handle = useContext(HandleContext);

  if (!handle) {
    throw new Error("SortableHandle must render inside a SortableItem.");
  }

  const { attributes, disabled, listeners, setActivatorNodeRef } = handle;

  // The native button already supplies the role and focusability that
  // dnd-kit's attributes would otherwise add. A disabled grip stays
  // focusable (dnd-kit drops its listeners) so keyboard focus survives the
  // save that follows each move.
  return (
    <Button
      aria-describedby={attributes["aria-describedby"]}
      aria-disabled={disabled}
      aria-label="Drag to reorder"
      aria-pressed={attributes["aria-pressed"]}
      aria-roledescription={attributes["aria-roledescription"]}
      className="!cursor-grab touch-none active:!cursor-grabbing"
      ref={setActivatorNodeRef}
      size="icon-xs"
      type="button"
      variant="ghost"
      {...listeners}
    >
      <GripVertical className="text-muted-foreground size-4" />
    </Button>
  );
}
