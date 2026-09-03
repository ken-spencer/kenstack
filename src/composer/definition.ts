import {
  createElement,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import * as z from "zod";

import { defineFields, type DefinedFields } from "@kenstack/admin/fields";
import { metaFieldOptions } from "@kenstack/admin/metaFields";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import { unsecureIdSchema } from "@kenstack/fields/unsecureId";

export type ComposerBlock = {
  id: string;
  kind: string;
} & Record<string, unknown>;

// Page-level facts (SEO metadata) live beside the blocks in one composer
// document; they are not blocks and cannot be reordered or archived.
export const composerMetaFields = defineFields({
  fields: {
    seoTitle: metaFieldOptions.seoTitle,
    seoDescription: metaFieldOptions.seoDescription,
  },
});

export const composerMetaSchema = createSchemaFromFields(composerMetaFields);

export type ComposerMeta = z.output<typeof composerMetaSchema>;

export function createComposerMetaDefaults() {
  return createDefaultValues(composerMetaFields) as ComposerMeta;
}

export type ComposerDocument = {
  blocks: ComposerBlock[];
  meta: ComposerMeta;
};

export function composerDocumentSchema(page: ComposerPage) {
  return z.object({
    blocks: page.schema,
    meta: composerMetaSchema,
  });
}

type ValuesFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: z.output<TFields[K]["zod"]>;
};

export type ComposerBlockValue<TFields extends DefinedFields> = {
  id: string;
  kind: string;
} & ValuesFromFields<TFields>;

export type ComposerBlockDefinition<TFields extends DefinedFields> = {
  component: ComponentType<{ block: ComposerBlockValue<TFields> }>;
  edit: ComponentType;
  fields: TFields;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

type ComposerBlockDefinitions<TFields extends Record<string, DefinedFields>> = {
  [K in keyof TFields]: ComposerBlockDefinition<TFields[K]>;
};

export function defineBlocks<
  const TFields extends Record<string, DefinedFields>,
>(blocks: ComposerBlockDefinitions<TFields>) {
  return blocks;
}

type RuntimeBlockDefinition = {
  component: ComponentType<{ block: ComposerBlock }>;
  edit: ComponentType;
  fields: DefinedFields;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  render: (block: ComposerBlock) => ReactNode;
};

export type ComposerPage<TKey extends string = string, TBlocks = unknown> = {
  blocks: TBlocks;
  definitions: Record<string, RuntimeBlockDefinition | undefined>;
  key: TKey;
  schema: z.ZodType<ComposerBlock[]>;
};

export type ComposerValidationResult =
  | { status: "success"; document: ComposerDocument }
  | {
      status: "error";
      issues: { message: string; path: string[] }[];
    };

const reservedFieldNames = new Set(["archived", "id", "kind", "version"]);

const archivedBlockIdentitySchema = z.object({ id: unsecureIdSchema });

export function definePage<
  const TKey extends string,
  const TFields extends Record<string, DefinedFields>,
>(
  key: TKey,
  blocks: ComposerBlockDefinitions<TFields>,
): ComposerPage<TKey, ComposerBlockDefinitions<TFields>> {
  if (!key.trim()) {
    throw new Error("A Composer page key is required.");
  }

  const schemas = new Map<string, z.ZodType>();
  const definitions: Record<string, RuntimeBlockDefinition | undefined> = {};
  for (const [kind, definition] of Object.entries(blocks)) {
    for (const fieldName of Object.keys(definition.fields)) {
      if (reservedFieldNames.has(fieldName)) {
        throw new Error(
          `Composer block "${kind}" cannot define reserved field "${fieldName}".`,
        );
      }
    }

    schemas.set(
      kind,
      createSchemaFromFields(definition.fields).safeExtend({
        id: unsecureIdSchema,
        kind: z.literal(kind),
      }),
    );
    definitions[kind] = createRuntimeBlockDefinition(definition);
  }

  const schema = z
    .array(z.record(z.string(), z.unknown()))
    .transform((document, context) => {
      const parsed: ComposerBlock[] = [];
      const ids = new Set<string>();

      for (const [index, block] of document.entries()) {
        const kind = typeof block.kind === "string" ? block.kind : "";
        const blockSchema = schemas.get(kind);
        if (!blockSchema) {
          context.addIssue({
            code: "custom",
            message: kind
              ? `Block kind "${kind}" is not available on this page.`
              : "Block kind is required.",
            path: [index, "kind"],
          });
          continue;
        }

        // An archived block is parked content: it keeps its raw values and
        // skips field validation until it is restored, so unfinished blocks
        // never hold up publishing the rest of the page.
        if (block.archived === true) {
          const identity = archivedBlockIdentitySchema.safeParse(block);
          if (!identity.success) {
            for (const issue of identity.error.issues) {
              context.addIssue({ ...issue, path: [index, ...issue.path] });
            }
            continue;
          }

          if (ids.has(identity.data.id)) {
            context.addIssue({
              code: "custom",
              message: "Block IDs must be unique within a page.",
              path: [index, "id"],
            });
            continue;
          }

          ids.add(identity.data.id);
          parsed.push({ ...block, archived: true, id: identity.data.id, kind });
          continue;
        }

        const result = blockSchema.safeParse(block);
        if (!result.success) {
          for (const issue of result.error.issues) {
            context.addIssue({ ...issue, path: [index, ...issue.path] });
          }
          continue;
        }

        const value = result.data as ComposerBlock;
        if (ids.has(value.id)) {
          context.addIssue({
            code: "custom",
            message: "Block IDs must be unique within a page.",
            path: [index, "id"],
          });
          continue;
        }

        ids.add(value.id);
        parsed.push(value);
      }

      return parsed;
    });

  return { blocks, definitions, key, schema };
}

function createRuntimeBlockDefinition<TFields extends DefinedFields>(
  definition: ComposerBlockDefinition<TFields>,
): RuntimeBlockDefinition {
  const Component = definition.component;

  return {
    // The page schema validates blocks against these fields before either
    // render path mounts the component, so the widened prop type is safe.
    component: Component as ComponentType<{ block: ComposerBlock }>,
    edit: definition.edit,
    fields: definition.fields,
    icon: definition.icon,
    label: definition.label,
    render: (block) =>
      createElement(Component, {
        // The page schema validates the block against these fields before render.
        block: block as ComposerBlockValue<TFields>,
      }),
  };
}

export function definePages<const TPages extends readonly ComposerPage[]>(
  pages: TPages,
) {
  const registry: Record<string, ComposerPage> = {};

  for (const page of pages) {
    if (registry[page.key]) {
      throw new Error(`Composer page key "${page.key}" is registered twice.`);
    }
    registry[page.key] = page;
  }

  return registry as {
    [TPage in TPages[number] as TPage["key"]]: TPage;
  };
}

export function getComposerBlockDefaults(page: ComposerPage, kind: string) {
  const definition = page.definitions[kind];
  if (!definition) {
    throw new Error(
      `Block kind "${kind}" is not available on Composer page "${page.key}".`,
    );
  }

  return createDefaultValues(definition.fields);
}
