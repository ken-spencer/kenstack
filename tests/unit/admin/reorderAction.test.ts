import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { integer, text } from "drizzle-orm/pg-core";
import * as z from "zod";

const mocks = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const tx = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: selectWhere })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn() })),
    })),
  };

  return {
    audit: vi.fn(),
    selectWhere,
    transaction: vi.fn(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
    tx,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@kenstack/api", () => ({
  pipelineStage: (
    _options: unknown,
    action: (context: Record<string, unknown>) => unknown,
  ) => action,
}));
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));

import { PipelineResponse } from "@kenstack/api/PipelineResponse";
import { reorderAction } from "@kenstack/admin/api/reorder";
import { defineFields } from "@kenstack/admin/fields";
import { defineModule, type DefinedAdminModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { field, textField } from "@kenstack/fields";

const products = defineTable({
  name: "reorder_action_products",
  reorder: true,
  columns: {
    categoryId: integer("category_id").notNull(),
    name: text("name").notNull(),
  },
});

const moduleConfig = defineModule({
  name: "reorder-action-products",
  admin: {
    fields: defineFields({
      fields: {
        categoryId: field({
          default: 0,
          kind: "test-category-id",
          zod: z.number().int().positive(),
        }),
        name: textField(),
      },
    }),
    table: products,
    list: {
      reorder: {
        scope: products.categoryId,
      },
    },
  },
});

const childModuleConfig = defineModule({
  name: "reorder-action-child-products",
  parent: {
    module: "categories",
    foreignKey: "categoryId",
  },
  admin: {
    fields: moduleConfig.admin.fields,
    table: products,
    list: {
      reorder: true,
    },
  },
});

async function runReorder(
  ids: number[],
  targetModule: DefinedAdminModule = moduleConfig,
) {
  const response = new PipelineResponse();

  await reorderAction(targetModule)({
    data: { ids },
    dataIn: {},
    request: new NextRequest("http://localhost/api/admin"),
    response,
    user: { id: 7 },
  });

  return response.toNextResponse().json();
}

describe("scoped reorder action", () => {
  beforeEach(() => {
    mocks.audit.mockClear();
    mocks.selectWhere.mockReset();
    mocks.tx.update.mockClear();
  });

  it("reorders a complete set from one scope", async () => {
    mocks.selectWhere
      .mockResolvedValueOnce([{ scope: 10 }, { scope: 10 }])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    await expect(runReorder([2, 1])).resolves.toEqual({ status: "success" });
    expect(mocks.tx.update).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it("rejects records from different scopes", async () => {
    mocks.selectWhere.mockResolvedValueOnce([{ scope: 10 }, { scope: 20 }]);

    await expect(runReorder([1, 2])).resolves.toEqual({
      status: "error",
      message:
        "Only records from one group can be reordered together. Refresh the list and try again.",
    });
    expect(mocks.tx.update).not.toHaveBeenCalled();
  });

  it("rejects child records from different parents", async () => {
    mocks.selectWhere.mockResolvedValueOnce([{ scope: 10 }, { scope: 20 }]);

    await expect(runReorder([1, 2], childModuleConfig)).resolves.toEqual({
      status: "error",
      message:
        "Only records from one group can be reordered together. Refresh the list and try again.",
    });
    expect(mocks.tx.update).not.toHaveBeenCalled();
  });

  it("rejects submitted records that are no longer active", async () => {
    mocks.selectWhere.mockResolvedValueOnce([]);

    await expect(runReorder([1, 2])).resolves.toEqual({
      status: "error",
      message:
        "The active records no longer match the loaded list. Refresh the list and reorder again.",
    });
    expect(mocks.tx.update).not.toHaveBeenCalled();
  });

  it("rejects an incomplete active scope", async () => {
    mocks.selectWhere
      .mockResolvedValueOnce([{ scope: 10 }, { scope: 10 }])
      .mockResolvedValueOnce([{ id: 1 }]);

    await expect(runReorder([1, 2])).resolves.toEqual({
      status: "error",
      message:
        "The active records no longer match the loaded list. Refresh the list and reorder again.",
    });
    expect(mocks.tx.update).not.toHaveBeenCalled();
  });
});
