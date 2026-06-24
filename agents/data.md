# Data Instructions

Read this before database, Drizzle, table schema, Zod, validation, or pipeline schema work.

## Database

- Use Drizzle ORM.
- Do not edit generated migrations casually.
- Do not change schema names or column names without checking existing migrations.
- Prefer explicit nullability and defaults.
- Avoid Drizzle `.select()` with no field projection unless the code truly consumes the full row as the domain object. Prefer `.select({ ... })` with the exact columns or expressions the caller reads, so query cost and TypeScript inference stay obvious. If a full-row select is necessary for an extension point such as field lifecycle hooks or revalidation callbacks, add a short nearby comment naming that boundary.

## Validation

- Use Zod v4.
- Prefer Zod's direct string message syntax when it is supported, for example `.refine(check, "Message")` and `.min(1, "Message")`, instead of wrapping simple messages in `{ message: "Message" }`.
- Keep client and server schemas aligned.
- Use server-specific coercion only where needed.
- Prefer passing schemas to `pipelineStage({ schema })` so parsing and errors are handled by the pipeline. Manual `safeParse` / `parse` inside a stage is an escape hatch for cases the pipeline cannot express.
- For submitted request data, the schema passed to `pipelineStage({ schema })` should produce the validated and normalized shape the action needs. Put request-field transforms, defaults, refinements, and derived request values in that pipeline schema instead of reparsing or reshaping the same fields inside the action handler.
- Do not call `.parse(...)` or `.safeParse(...)` inside a pipeline action for fields that were already accepted by that action's pipeline schema. If the handler needs a different output shape, define an action-specific schema with `.transform(...)` or `.pipe(...)` and pass that schema to `pipelineStage`.
- If a client form needs raw input values while the server action needs normalized values, keep the client form schema focused on form input and derive a separate server/action schema from it for the pipeline stage. Do not share a client schema in a way that forces the server action to manually reparse the same payload.
- Manual parsing inside a pipeline action is only acceptable for data that is not the submitted request payload, a truly external/untyped boundary, or a dynamic schema that cannot be known until the action loads additional context. Keep that exception narrow and make the reason clear in the surrounding code.
- Before adding a hand-written validator, type guard, or `typeof` shape check for submitted data, check for an existing Zod schema that already owns that shape. Reuse the schema at the boundary instead of duplicating validation logic.
- Do not re-parse field values inside field save/load/display behavior when the enclosing action has already parsed the payload through its pipeline schema. Treat field behavior as receiving validated values, and keep any necessary cast narrow at that untyped lifecycle boundary.
- Do not create a second enhanced schema when the original can be defined correctly at the point of use. Move the schema closer to the needed runtime context instead of layering `baseSchema` plus `schemaWithConfig`, unless the base schema is reused independently.
- Be cautious with `z.unknown().transform(...)`. Use it only at a real untyped boundary. If the transform is mostly interpreting application grammar or query behavior, keep Zod focused on request shape/coercion and do that interpretation near the code that uses the result.
