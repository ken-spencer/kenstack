import type { Metadata } from "next";

import HydratedQuery from "@kenstack/context/HydratedQuery";
import { pageRoute } from "@kenstack/pageRoute";
import OrdersList from "./List";
import { listOrders } from "./queries";
import { orderListSchema } from "./query";

export const metadata: Metadata = { title: { absolute: "Orders · Admin" } };

export default pageRoute(
  { access: "admin", fallback: <p>Loading orders…</p> },
  async ({ searchIn, user }) => {
    const query = orderListSchema.parse({ search: searchIn });
    return (
      <div className="space-y-4 py-2">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <HydratedQuery
          queryKey={["payments", "orders", user.id, query]}
          data={{ status: "success", ...(await listOrders(query)) }}
        >
          <OrdersList currentUserId={user.id} />
        </HydratedQuery>
      </div>
    );
  },
);
