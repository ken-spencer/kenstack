import * as z from "zod";

import { pipelineStage } from "@kenstack/api";
import { parseListSearchParams } from "@kenstack/list/querySchema";
import {
  emailLogSort,
  listEmailMessages,
  loadEmailLogFilters,
} from "./queries";

export const emailLogAction = () =>
  pipelineStage(
    {
      access: "admin",
      schema: z.object({
        search: z.record(
          z.string(),
          z.union([z.string(), z.array(z.string()), z.undefined()]),
        ),
      }),
    },
    async ({ data, response }) => {
      const filters = await loadEmailLogFilters();
      return response.success(
        await listEmailMessages(
          parseListSearchParams({
            filters,
            sort: emailLogSort,
            searchParams: data.search,
          }),
          filters,
        ),
      );
    },
  );
