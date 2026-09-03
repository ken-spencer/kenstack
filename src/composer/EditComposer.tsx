import EditComposerClient from "./EditComposerClient";
import {
  composerMetaSchema,
  createComposerMetaDefaults,
  getComposerBlockDefaults,
  type ComposerBlock,
  type ComposerPage,
  type ComposerValidationResult,
} from "./definition";

export default function EditComposer({
  document,
  meta,
  page,
  validateAction,
  viewHref,
}: {
  document: ComposerBlock[];
  meta?: Record<string, unknown>;
  page: ComposerPage;
  validateAction: (
    pageKey: string,
    document: unknown,
  ) => Promise<ComposerValidationResult>;
  viewHref: string;
}) {
  const initialDocument = page.schema.parse(document);
  const initialMeta = composerMetaSchema.parse({
    ...createComposerMetaDefaults(),
    ...meta,
  });
  const definitions = Object.entries(page.definitions).flatMap(
    ([kind, definition]) => {
      if (!definition) {
        return [];
      }
      const Icon = definition.icon;
      const Edit = definition.edit;
      const fieldEntries = Object.entries(definition.fields);
      const titleField = fieldEntries.find(
        ([, field]) => field.kind === "text",
      )?.[0];
      const subtitleField = fieldEntries.find(
        ([, field]) => field.kind === "textarea",
      )?.[0];
      const countField = fieldEntries.find(([, field]) =>
        Array.isArray(field.default),
      )?.[0];

      return [
        {
          Component: definition.component,
          defaults: getComposerBlockDefaults(page, kind),
          edit: <Edit />,
          icon: Icon ? <Icon aria-hidden="true" className="size-4" /> : null,
          kind,
          label: definition.label,
          preview: { countField, subtitleField, titleField },
        },
      ];
    },
  );

  return (
    <EditComposerClient
      definitions={definitions}
      initialDocument={initialDocument}
      initialMeta={initialMeta}
      pageKey={page.key}
      validateAction={validateAction}
      viewHref={viewHref}
    />
  );
}
