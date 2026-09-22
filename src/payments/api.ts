import type { NextRequest } from "next/server";
import * as z from "zod";

import { multiPipeline, pipeline, pipelineStage } from "@kenstack/api";
import { listOrders, searchOrderCustomers } from "./orders/queries";
import { orderListSchema } from "./orders/query";

// One host mount for shared payment actions; each action owns its authorization.
export function paymentsPost(request: NextRequest) {
  return multiPipeline(
    { request },
    {
      "list-orders": (options) =>
        pipeline(
          options,
          pipelineStage(
            { schema: orderListSchema },
            async ({ data, response }) => {
              response.headers.set("Cache-Control", "private, no-store");
              return response.success(await listOrders(data));
            },
          ),
        ),
      "search-order-customers": (options) =>
        pipeline(
          options,
          pipelineStage(
            { schema: z.object({ term: z.string().trim().max(200) }) },
            async ({ data, response }) => {
              response.headers.set("Cache-Control", "private, no-store");
              return response.success(await searchOrderCustomers(data.term));
            },
          ),
        ),
    },
  );
}
