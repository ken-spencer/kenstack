import { Fragment } from "react";

import type { ComposerBlock, ComposerPage } from "./definition";

export default function Composer({
  document,
  page,
}: {
  document: ComposerBlock[];
  page: ComposerPage;
}) {
  const parsed = page.schema.parse(document);

  return parsed.map((block) => {
    const definition = page.definitions[block.kind];
    if (!definition || block.archived === true) {
      return null;
    }

    return <Fragment key={block.id}>{definition.render(block)}</Fragment>;
  });
}
