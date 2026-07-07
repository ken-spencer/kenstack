# Debug Instructions

Read this before fixing errors, warnings, hydration mismatches, broken UI states, failing tests, runtime exceptions, console errors, or regressions.

## Debug Without Churn

Proceed autonomously only while the cause is clear enough to justify a narrow fix. If the work becomes exploratory, repetitive, or speculative, stop and ask for guidance before changing more code.

Use evidence first:

- Check the worktree and preserve unrelated changes.
- Read the exact error, warning, stack, logs, screenshot, test output, or user report.
- Separate the primary symptom from incidental noise.
- Reproduce or observe the failure when practical with the cheapest targeted check.
- Trace from the failing surface to the closest owning code.
- Prefer existing Kenstack patterns, shared primitives, and local helpers.

Apply a fix only when it is narrow and behavior-preserving. A good fix usually makes one local value deterministic, corrects one stale condition, narrows one event/focus/cache path, or swaps one call to an existing project helper. Avoid broad rewrites, new abstractions, casts, optional fields, defensive branches, mirrored state, or compatibility shims when the cause is not proven.

Before finalizing, verify with the narrowest useful check and review the final diff for churn: unrelated formatting, renamed locals, moved code, broad API changes, type machinery, temporary debug output, or behavior reductions.

## Stop And Ask

Pause and consult the user when any of these are true:

- The first suspected fix does not work and the next step would be a different guess.
- The same area has been edited more than once without stronger evidence.
- The fix requires a broad refactor, new dependency, API shape change, migration, or significant behavior tradeoff.
- The evidence points into domain rules, recently edited work, or ambiguous product behavior.
- Verification requires expensive, destructive, production-like, or user-disruptive actions the user did not request.

When pausing, report what was observed, what was ruled out, the leading hypotheses, and the smallest next check or decision needed.

## Hydration Mismatches

For hydration mismatches, first identify the exact server/client value that differs. Do not rewrite the component, add client-only state, add effects, or move date formatting around before proving the mismatch source.

For date or time display text, the usual narrow fix is to keep the rendered value deterministic or add `suppressHydrationWarning` on the specific element whose text/value can legitimately differ between server and client. This is especially appropriate when the mismatch comes from timezone, locale, browser date formatting, or a value that is inherently client-specific.

Use `suppressHydrationWarning` narrowly. Put it on the exact text or input element with the expected mismatch, not on a parent section or whole component. Do not use it to hide unrelated structural mismatches, missing elements, invalid HTML, randomized IDs, unstable data loading, or divergent conditional rendering.
