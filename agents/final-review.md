# Final Review

Use this only when the user explicitly requests final review. Final review coordinates any review still needed, preflight checks, and staging readiness; use `agents/review.md` for ordinary on-demand code review.

1. Determine whether the completed change has already been reviewed against `agents/review.md` and the relevant specialist instructions. If it has, use that review and do not repeat it. Otherwise, request an independent review. Address concrete unresolved findings before running final checks.
2. Confirm that required documentation and downstream migration notes are complete.
3. Run the narrowest relevant existing checks once: TypeScript for type changes, lint for style changes, a production build for runtime-sensitive Next.js changes, and relevant unit tests. If a correction affects tested behavior, rerun only the affected checks. Do not create unit tests without explicit user approval; keep approved tests under `tests/unit`.
4. Review the final diff for unrelated formatting, file moves, broad refactors, temporary code, and unresolved findings.
5. When staging is part of the task, stage only changes that pass and are mechanical or otherwise very high certainty. Leave uncertain changes for human review.

Do not treat staged-versus-unstaged split state as a problem by itself; judge whether the resulting code is coherent and ready.
