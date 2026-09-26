# Claude Code

Rules for Claude Code sessions on any Kenstack site. Each site's `CLAUDE.md` imports this file.

## Keep going

When a step doesn't need the user's input, keep going, and put status notes in the same message as the
next action. This is for carrying out agreed work, such as the next known unit of a plan or spec: do not
stop once it is understood. Stop and ask when you can't continue without the user, when the message is
a question or a design discussion rather than a request to implement, or before anything destructive
or outward-facing, such as deleting data, force-pushing, or sending anything to an outside service.

## Terminal Command Permission Hygiene

When a terminal command is needed, prefer a phrasing that does not trigger a permission prompt. Ask
for permission only when there is no practical alternative.

When a command is safe and likely to recur, recommend a specific local settings rule that would permit
it permanently, so the same prompt is not needed again.

Do not wrap terminal work in shell control flow. Avoid `for`, `while`, and `until` loops, `if`/`case`
blocks, inline function definitions, and command substitution in tool calls. The permission checker
cannot decompose these into their constituent commands, so the call prompts even when every command
inside it is already allowed, and no narrow settings rule can fix that — a rule broad enough to match
the loop header would auto-approve whatever the body contains.

Express the same work another way instead: a single invocation carrying multiple patterns or paths, a
straight pipeline of allowed commands, or separate tool calls issued in parallel. When repetition is
genuinely unavoidable, prefer a tool that repeats internally, such as `rg` with several `-e` patterns or
`find -exec`, over a shell loop.
