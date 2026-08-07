# Debugging

Consult this reference when diagnosing or fixing a regression, failed check, runtime error, warning,
hydration mismatch, or broken UI.

## Establish the cause

- A diagnosis-only request is read-only. Edit only when the request includes fixing the problem.
- Establish the exact observed failure and the narrowest code or boundary capable of causing it before
  editing. Distinguish reproduced evidence from a leading hypothesis.
- Make a change only when the evidence supports a causal explanation and the change is narrow enough to
  test that explanation. Verify it with the smallest check that exercises the failing boundary.
- If an experimental change fails, remove only that experiment before continuing. Preserve pre-existing
  and user-owned changes; stop when the experiment cannot be separated from them safely.
- After a failed check, continue editing only when the result provides stronger evidence and the next
  change follows directly from it.

## Stop before compensating

Stop editing and continue with read-only evidence gathering before:

- making another speculative edit after the first causal explanation failed;
- editing the same area again without stronger evidence;
- changing several layers without one demonstrated causal chain;
- adding a broad refactor, abstraction, cast, optional field, defensive branch, mirrored state, or
  compatibility shim merely to make the symptom disappear;
- removing or bypassing conditionals, resets, invalidations, redirects, cache updates, features, tests,
  lint, or type safety without tracing what they protect and proving the fix preserves it;
- applying a hard-coded exception or other brute-force change; or
- choosing behavior when the cause depends on an unresolved product or domain decision.

At that gate, report what was reproduced, what the evidence ruled out, the leading remaining hypothesis,
and the smallest next check or user decision. A verified fix reports the cause, the correction, and the
check that confirmed it.
