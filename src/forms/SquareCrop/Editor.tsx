"use client";

import {
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus, Plus } from "lucide-react";

import Button from "@kenstack/components/Button";
import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";
import {
  getSquareCropMaxZoom,
  normalizeSquareCrop,
  squareImageSize,
} from "./geometry";
import SquareCropPreview from "./Preview";

export default function SquareCropEditor({
  crop,
  onCancel,
  onChange,
  onDone,
  round,
  source,
}: {
  crop: SquareCrop | null;
  onCancel: () => void;
  onChange: (crop: SquareCrop | null) => void;
  onDone: () => void;
  round: boolean;
  source: CropSource;
}) {
  const { height, width } = source;
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    crop: SquareCrop;
    distance: number;
    midpoint: { x: number; y: number };
  } | null>(null);
  const tapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const instructionsId = useId();
  const normalized = normalizeSquareCrop(crop, width, height);
  const controlMaxZoom = Number(getSquareCropMaxZoom(width, height).toFixed(1));
  const controlZoom = Number(normalized.zoom.toFixed(1));
  const atMinimumZoom = controlZoom <= 1;
  const atMaximumZoom = controlZoom >= controlMaxZoom;
  const lowResolution =
    Math.min(width, height) / normalized.zoom < squareImageSize;

  const updateZoom = (zoom: number) => {
    onChange(normalizeSquareCrop({ ...normalized, zoom }, width, height));
  };

  const move = (dx: number, dy: number, viewportSize: number) => {
    const zoom = normalized.zoom;
    const scale = (viewportSize * zoom) / Math.min(width, height);
    onChange(
      normalizeSquareCrop(
        {
          ...normalized,
          x: normalized.x - dx / (width * scale),
          y: normalized.y - dy / (height * scale),
        },
        width,
        height,
      ),
    );
  };

  const zoomAtPoint = (
    baseCrop: SquareCrop,
    zoom: number,
    point: { x: number; y: number },
    viewportSize: number,
  ) => {
    const baseZoom = baseCrop.zoom;
    const shortEdge = Math.min(width, height);
    const sourceX =
      baseCrop.x +
      ((point.x / viewportSize - 0.5) * shortEdge) / baseZoom / width;
    const sourceY =
      baseCrop.y +
      ((point.y / viewportSize - 0.5) * shortEdge) / baseZoom / height;

    return normalizeSquareCrop(
      {
        x:
          sourceX - ((point.x / viewportSize - 0.5) * shortEdge) / zoom / width,
        y:
          sourceY -
          ((point.y / viewportSize - 0.5) * shortEdge) / zoom / height,
        zoom,
      },
      width,
      height,
    );
  };

  const cropPinch = (
    baseCrop: SquareCrop,
    zoom: number,
    start: { x: number; y: number },
    current: { x: number; y: number },
    viewportSize: number,
  ) => {
    const anchored = zoomAtPoint(baseCrop, zoom, start, viewportSize);
    const shortEdge = Math.min(width, height);

    return normalizeSquareCrop(
      {
        ...anchored,
        x:
          anchored.x -
          ((current.x - start.x) * shortEdge) / viewportSize / zoom / width,
        y:
          anchored.y -
          ((current.y - start.y) * shortEdge) / viewportSize / zoom / height,
      },
      width,
      height,
    );
  };

  const startPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pointerStartRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setInteracting(true);

    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 2) {
      pinchRef.current = {
        crop: normalized,
        distance: pointerDistance(pointers[0], pointers[1]),
        midpoint: pointerMidpoint(pointers[0], pointers[1]),
      };
    }
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pointers = [...pointersRef.current.values()];
    const pinch = pinchRef.current;
    if (pointers.length === 2 && pinch && pinch.distance > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const currentMidpoint = pointerMidpoint(pointers[0], pointers[1]);
      const nextZoom =
        pinch.crop.zoom *
        (pointerDistance(pointers[0], pointers[1]) / pinch.distance);
      onChange(
        cropPinch(
          pinch.crop,
          nextZoom,
          {
            x: pinch.midpoint.x - rect.left,
            y: pinch.midpoint.y - rect.top,
          },
          {
            x: currentMidpoint.x - rect.left,
            y: currentMidpoint.y - rect.top,
          },
          event.currentTarget.clientWidth,
        ),
      );
      return;
    }

    move(
      event.clientX - previous.x,
      event.clientY - previous.y,
      event.currentTarget.clientWidth,
    );
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerStart = pointerStartRef.current;
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;

    if (
      event.pointerType === "touch" &&
      pointerStart?.id === event.pointerId &&
      Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      ) < 8
    ) {
      const previousTap = tapRef.current;
      const now = Date.now();
      if (
        previousTap &&
        now - previousTap.at < 350 &&
        Math.hypot(
          event.clientX - previousTap.x,
          event.clientY - previousTap.y,
        ) < 24
      ) {
        onChange(null);
        tapRef.current = null;
      } else {
        tapRef.current = { at: now, x: event.clientX, y: event.clientY };
      }
    }

    pointerStartRef.current = null;
    setInteracting(pointersRef.current.size > 0);
  };

  return (
    <div className="flex min-h-0 flex-col bg-neutral-900 p-3 text-white sm:p-4">
      <div className="relative flex min-h-[15rem] flex-1 items-center justify-center overflow-hidden">
        <img
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-20 select-none"
          draggable={false}
          src={source.url}
        />
        <p id={instructionsId} className="sr-only">
          Arrow keys move. Plus and minus zoom.
        </p>
        <div
          aria-describedby={instructionsId}
          aria-label="Square crop"
          className={`relative aspect-square w-full max-w-[min(30rem,calc(100vh-13rem))] touch-none overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-white ${interacting ? "cursor-grabbing" : "cursor-grab"}`}
          role="group"
          tabIndex={0}
          onDoubleClick={() => onChange(null)}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.05 : 0.01;
            const viewportSize = event.currentTarget.clientWidth;
            if (event.key === "ArrowLeft") {
              move(-viewportSize * step, 0, viewportSize);
            } else if (event.key === "ArrowRight") {
              move(viewportSize * step, 0, viewportSize);
            } else if (event.key === "ArrowUp") {
              move(0, -viewportSize * step, viewportSize);
            } else if (event.key === "ArrowDown") {
              move(0, viewportSize * step, viewportSize);
            } else if (event.key === "+" || event.key === "=") {
              updateZoom(controlZoom + 0.1);
            } else if (event.key === "-") {
              updateZoom(controlZoom - 0.1);
            } else {
              return;
            }
            event.preventDefault();
          }}
          onPointerDown={startPointer}
          onPointerMove={movePointer}
          onPointerCancel={endPointer}
          onPointerUp={endPointer}
        >
          <SquareCropPreview
            alt=""
            className="absolute inset-0 h-full w-full"
            crop={normalized}
            source={source}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-150 [&>*]:border-white/60 ${interacting ? "opacity-35" : "opacity-0"}`}
          >
            {Array.from({ length: 9 }, (_, index) => (
              <span
                key={index}
                className="border-r border-b nth-[3n]:border-r-0 nth-[n+7]:border-b-0"
              />
            ))}
          </div>
          {round ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
            />
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-3 grid w-full max-w-[30rem] gap-2">
        <p className="text-center text-sm font-medium">
          {controlZoom.toFixed(1)}×
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            className="grid size-8 shrink-0 place-items-center rounded hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atMinimumZoom}
            onClick={() => updateZoom(controlZoom - 0.1)}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <label className="sr-only" htmlFor="square-crop-zoom">
            Zoom
          </label>
          <input
            id="square-crop-zoom"
            className="w-full accent-white"
            type="range"
            min={1}
            max={controlMaxZoom}
            step={0.1}
            value={controlZoom}
            disabled={controlMaxZoom === 1}
            onChange={(event) => updateZoom(Number(event.target.value))}
          />
          <button
            type="button"
            aria-label="Zoom in"
            className="grid size-8 shrink-0 place-items-center rounded hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atMaximumZoom}
            onClick={() => updateZoom(controlZoom + 0.1)}
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-white/70">
          <span className={lowResolution ? "text-amber-300" : undefined}>
            {lowResolution
              ? "Low resolution — result will be upscaled"
              : `Saved as ${squareImageSize} × ${squareImageSize}`}
          </span>
          <button
            type="button"
            className="font-medium text-white hover:underline"
            onClick={() => onChange(null)}
          >
            Reset
          </button>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 bg-neutral-900 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function pointerDistance(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerMidpoint(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}
