# Testing

What earns a test in Kenstack and its host sites. The `$tests` skill applies these rules; development
adds no tests.

## What qualifies

- A test covers a durable observable behavior or compile-time contract with a plausible regression a
  reader would miss.
- These never qualify, so write no test and delete an existing one that only checks them: interface
  wording (labels, headings, notices, help and error text), the order or count of calls between
  internal modules, mock chains, generated SQL text, markup or class names, a constant's value, a
  restatement of the implementation or its defaults, development-only scaffolding, and a behavior
  another test already covers. Instead, assert the state, value, role, or result the wording
  reports, such as a disabled control, an amount, or a returned status, or the side effects that
  reach the outside world, such as one provider charge or no email sent, and move claims about what
  a query returns or locks to the PostgreSQL suite. Wording or a constant is pinned only when it is
  itself a legal, protocol, or compatibility requirement. Copy changes often, so a test that pins it
  breaks on every edit and protects nothing.
- Derive expected values from the requirement, an incident, an independent oracle, or deliberately
  characterized existing behavior. Review and accept observed output before it becomes an expectation.

## Boundaries

- Test through a public or domain boundary. If behavior is unreachable, establish whether a real
  production contract is missing before adding one.
- Runtime tests exercise runtime behavior. Keep compile-time contract fixtures under `tests/types/` and
  verify them with TypeScript; a Vitest case cannot check an erased type.
- Use the narrowest test boundary that can establish the contract. When it depends on wiring,
  transaction rollback, database concurrency, provider protocol behavior, or rendered interaction, use
  an integration or UI test, and keep those tests out of routine verification for changes that do not
  affect their boundary.
