# Data Instructions

Read this before database, Drizzle, table schema, Zod, validation, or pipeline schema work.

## Database

- Use Drizzle ORM.
- Do not edit generated migrations casually.
- Do not change schema names or column names without checking existing migrations.
- Prefer explicit nullability and defaults.

## Validation

- Use Zod v4.
- Prefer Zod's direct string message syntax when it is supported, for example `.refine(check, "Message")` and `.min(1, "Message")`, instead of wrapping simple messages in `{ message: "Message" }`.
- Keep client and server schemas aligned.
- Use server-specific coercion only where needed.
- Prefer passing schemas to `pipelineStage({ schema })` so parsing and errors are handled by the pipeline. Manual `safeParse` / `parse` inside a stage is an escape hatch for cases the pipeline cannot express.
- Before adding a hand-written validator, type guard, or `typeof` shape check for submitted data, check for an existing Zod schema that already owns that shape. Reuse the schema at the boundary instead of duplicating validation logic.
- Do not re-parse field values inside field save/load/display behavior when the enclosing action has already parsed the payload through its pipeline schema. Treat field behavior as receiving validated values, and keep any necessary cast narrow at that untyped lifecycle boundary.
- Do not create a second enhanced schema when the original can be defined correctly at the point of use. Move the schema closer to the needed runtime context instead of layering `baseSchema` plus `schemaWithConfig`, unless the base schema is reused independently.
- Be cautious with `z.unknown().transform(...)`. Use it only at a real untyped boundary. If the transform is mostly interpreting application grammar or query behavior, keep Zod focused on request shape/coercion and do that interpretation near the code that uses the result.
