import assert from "node:assert/strict";
import { test } from "vitest";

import { squareCropSchema } from "@kenstack/zod/image";
import {
  getSquareCropExtract,
  getSquareCropMaxZoom,
  normalizeSquareCrop,
} from "@kenstack/forms/SquareCrop/geometry";

test("legacy square crops drop mode and default missing zoom", () => {
  assert.deepEqual(
    squareCropSchema.parse({ mode: "manual", x: 0.25, y: 0.75 }),
    { x: 0.25, y: 0.75, zoom: 1 },
  );
});

test("square crop zoom never uses fewer than 800 source pixels", () => {
  assert.equal(getSquareCropMaxZoom(400, 1200), 1);
  assert.equal(getSquareCropMaxZoom(799, 1200), 1);
  assert.equal(getSquareCropMaxZoom(800, 1200), 1);
  assert.equal(getSquareCropMaxZoom(801, 1200), 801 / 800);
  assert.equal(getSquareCropMaxZoom(1600, 2000), 2);
  assert.equal(getSquareCropMaxZoom(4000, 5000), 4);
});

test("normalization clamps an oversized crop to the pixel-safe zoom", () => {
  assert.deepEqual(
    normalizeSquareCrop({ x: 0.5, y: 0.5, zoom: 2 }, 799, 1200),
    { x: 0.5, y: 0.5, zoom: 1 },
  );

  assert.equal(
    getSquareCropExtract({ x: 0.5, y: 0.5, zoom: 2 }, 1600, 2000).width,
    800,
  );
});
