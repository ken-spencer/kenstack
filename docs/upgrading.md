# Kenstack Upgrades

Consult this reference when changing a committed Kenstack API, writing its migration note, or moving a
host site to a newer Kenstack.

## Migration notes

- Treat every committed public API as externally consumed, even when no consumer is visible in the
  current repository. Document a break's required migration even when a compiler, type checker, schema,
  or lint rule would also expose it. Do not add notes for uncommitted APIs or internal surfaces with no
  downstream consumers; update their in-repository call sites directly.
- Append the note under `## Unreleased` at the top of `CHANGELOG.md` as a `### <Title>` section
  describing the old API, the new API, and the migration steps. Read only the `Unreleased` section
  first, and extend an existing note when this cycle already changed the same API. Released sections are
  history; do not read them to write a note.
- Notes describe the current implemented API; they do not define it. During review, verify each note in
  the diff against the implementation and current public contract. If a note has drifted, correct the
  note; change the API only when the implementation independently requires it, then update the note.

## Releases

- A host's submodule pointer is its Kenstack version; tags name those commits. Kenstack uses `0.x`
  semantic versions: when `Unreleased` contains a note, the next release bumps the minor version;
  otherwise it bumps the patch version.
- To release, rename `## Unreleased` to `## <version> — <date>`, set `version` in `package.json` to the
  same value, commit, and tag that commit `v<version>`. Release only on an explicit request.
- To upgrade a host, read its current version with `git -C kenstack describe --tags`, move the submodule
  to the new tag, and apply every `CHANGELOG.md` section between the two versions in order.
