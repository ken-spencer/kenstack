# Kenstack

Kenstack is a shared CMS/admin core for Next.js host sites. Host projects provide application-specific modules, tables, narrow host bindings, and environment configuration through the documented Kenstack entry points.

## Host Expectations

- Next.js App Router
- React 19.2+
- Node.js 24+
- Drizzle/Postgres application tables
- `@app/db`, `@app/email`, `@app/modules`, and `@app/roles` mapped to their host owners
- Kenstack modules defined with `defineModule`, `defineTable`, `defineFields`, and field helpers

## Scripts

Run scripts from this package directory unless your host site wraps them.

```bash
npm run trace
```

Starts Next.js in development mode on port 3001 with deprecation tracing enabled.

```bash
npm run lint
npm run prettier
```

Checks lint and formatting.

## Record Saving

Use `saveModuleRecord` for authenticated site actions that update a record owned by a Kenstack module. It derives the table, persistence behavior, and cache revalidation from `module`; the action supplies its restricted server field set so the response cannot include admin-only fields. Field handlers receive restricted authority, so existing media must already belong to the record and admin-managed metadata is preserved.

```ts
await saveModuleRecord({ module, fields, id, changes, values });
```

Use `saveAdminRecord` for the standard admin save action. It accepts the same record input, derives the same module behavior, and gives field handlers admin-save authority. The owning pipeline must enforce `access: "admin"`; this helper does not check the current user's role.

```ts
await saveAdminRecord({ module, id, changes, values });
```

Use `saveRecord` only when persistence is not represented by a module, such as module settings or page-editor content with a custom upsert. It is restricted by default. Pass `admin: true` only from a backend action that has already established admin access; never accept or derive this value from submitted data or the user's roles.

## Orders Admin

Hosts using the shared payment tables can mount the read-only orders admin with three route files:

```ts
// app/api/payments/route.ts
export { paymentsPost as POST } from "@kenstack/payments/api";

// app/admin/orders/page.tsx
export { default, metadata } from "@kenstack/payments/orders/Page";

// app/admin/orders/[id]/page.tsx
export { default, metadata } from "@kenstack/payments/orders/DetailPage";
```

The admin layout supplies Kenstack's `QueryProvider`. Add an Orders navigation link to
`/admin/orders`; a user record can link to `/admin/orders?userId=<id>`. The list searches, filters,
sorts and paginates on the server. Customer lookup starts at two characters and returns at most
20 matches. Dates and date filters use UTC.

`/api/payments` dispatches shared payment actions by `action`, so additional actions require no
new host route. The order loaders enforce fresh admin authorization, including customer lookup.
Keep the signed Stripe webhook at its configured endpoint; it uses Stripe's raw-body protocol.

## Shared Checkout

`createCheckout` from `@kenstack/payments/checkout/server` gives every product the same pay flow. The
host binds it once to its payments instance, users table and currency, then defines one product per
thing it sells:

```ts
// payments.ts
export const defineCheckout = createCheckout({
  payments,
  users,
  currency: "cad",
});

// a product
const checkout = defineCheckout({
  name: "donation", // quota scope `donation-checkout`
  schema, // Zod schema of the customer's choices
  requiresAddress: true,
  returnPath: "/donate/complete",
  async lines({ choices, user, connection }) {
    return {
      lines: [
        {
          kind: "donation",
          description: "Donation",
          quantity: 1,
          unitCents: 2500,
        },
      ],
      schedule: { type: "once" }, // or { type: "monthly" }, or { type: "instalments", count }
    };
  },
});
```

The host supplies the lines being bought, a taxed line's `taxCategory` with the quote's `tax` region,
the schedule, and an optional `reservation` with `hold` (links held stock to the new order, after the
order and items are inserted) and `extend` (renews it on a retry, from the saved order). Kenstack does
every calculation, saves the order at the first Pay, retries a declined order under the same id, and
refuses a Pay whose displayed lines no longer match with `checkout_lines_changed`. A taxed line whose
tax region is missing sells with zero tax and reports the error. Mount the returned `session`, `pay`,
`drop` and `status` stages as actions of one route.

On the client, `Checkout` from `@kenstack/payments/checkout/Checkout` is the whole pay step inside a
StepFlow: `<Checkout apiPath="/api/donate" choices={choices} />`. `choices` must hold only what changes
what is bought, with a stable key order; a change drops the unpaid order and starts another.
`CheckoutStatus` from `@kenstack/payments/checkout/Status` is the return page body:
`<CheckoutStatus apiPath sessionId storeId checkoutHref>` with the host's thank-you content as
children. `checkout/theme.css` ships structure only; the host theme styles `.checkout`,
`.checkout-status` and `.summary`.

## Server Error Reporting

Email alerting is enabled when the host provides:

- `MONITORING_EMAIL`
- `FROM_ADDRESS`
- optionally Upstash Redis, as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` or the Vercel Marketplace pair `KV_REST_API_URL` and `KV_REST_API_TOKEN`: with it, repeats of one error are emailed once per 15 minutes; without it, every error is emailed

## Conventions

Standing agent rules live in `AGENTS.md`; stable technical references live in `docs/`, and downstream
migration notes live in `CHANGELOG.md`.
