import "server-only";

import { getTableColumns, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import pluralize from "pluralize";

export const relationshipName = Symbol("kenstack.relationshipName");

export type RelationshipColumn = AnyPgColumn;

export type RelationshipTable<
  TTableName extends string,
  TRelationshipName extends string,
> = {
  id: RelationshipColumn;
  _: { name: TTableName };
  [relationshipName]: TRelationshipName;
};

type RuntimeRelationshipTable<TRelationshipName extends string = string> =
  AnyPgTable & RelationshipTable<string, TRelationshipName>;

type RelationshipInput = {
  through: AnyPgTable & { relationship: RelationshipColumn };
  from: RuntimeRelationshipTable;
  to: RuntimeRelationshipTable;
  fromColumn?: RelationshipColumn;
  toColumn?: RelationshipColumn;
  relationship?: string;
  label?: RelationshipColumn | SQL;
  search?: readonly (RelationshipColumn | SQL)[];
  orderBy?: readonly SQL[];
};

type DerivedThroughColumns<TInput extends RelationshipInput> =
  ("fromColumn" extends keyof TInput
    ? object
    : Record<
        `${TInput["from"][typeof relationshipName]}Id`,
        RelationshipColumn
      >) &
    ("toColumn" extends keyof TInput
      ? object
      : Record<
          `${TInput["to"][typeof relationshipName]}Id`,
          RelationshipColumn
        >);

type CheckedRelationshipInput<TInput extends RelationshipInput> = TInput & {
  through: TInput["through"] & DerivedThroughColumns<TInput>;
  fromColumn?: ThroughColumn<TInput>;
  toColumn?: ThroughColumn<TInput>;
};

type ThroughColumn<TInput extends RelationshipInput> = ReturnType<
  typeof getTableColumns<TInput["through"]>
>[keyof ReturnType<typeof getTableColumns<TInput["through"]>>];

type RelationshipInputMap<
  TRelationships extends Record<string, RelationshipInput>,
> = {
  [TKey in keyof TRelationships]: CheckedRelationshipInput<
    TRelationships[TKey]
  >;
};

export function defineRelationships<
  const TRelationships extends Record<string, RelationshipInput>,
>(relationships: TRelationships & RelationshipInputMap<TRelationships>) {
  const resolvedRelationships: Record<string, Relationship> =
    Object.fromEntries(
      Object.entries(relationships).map(([key, relationship]) => {
        const fromColumnName = `${relationship.from[relationshipName]}Id`;
        const toColumnName = `${relationship.to[relationshipName]}Id`;
        const fromColumn =
          relationship.fromColumn ??
          (relationship.through[
            fromColumnName as keyof typeof relationship.through
          ] as RelationshipColumn);
        const toColumn =
          relationship.toColumn ??
          (relationship.through[
            toColumnName as keyof typeof relationship.through
          ] as RelationshipColumn);
        const throughColumns = getTableColumns(relationship.through);
        const resolved = {
          ...relationship,
          kind: "manyToMany",
          relationship: relationship.relationship ?? pluralize.singular(key),
          fromColumnKey: relationship.fromColumn
            ? getRelationshipColumnKey(throughColumns, fromColumn, "from")
            : fromColumnName,
          toColumnKey: relationship.toColumn
            ? getRelationshipColumnKey(throughColumns, toColumn, "to")
            : toColumnName,
          fromColumn,
          toColumn,
          fromPrimaryKey: relationship.from.id,
          toPrimaryKey: relationship.to.id,
        } satisfies Relationship;

        return [key, resolved];
      }),
    );

  return resolvedRelationships as {
    [TKey in keyof TRelationships]: Relationship;
  };
}

function getRelationshipColumnKey(
  throughColumns: Record<string, RelationshipColumn>,
  column: RelationshipColumn,
  side: "from" | "to",
) {
  const entry = Object.entries(throughColumns).find(
    ([, throughColumn]) => throughColumn === column,
  );
  if (!entry) {
    throw new Error(
      `Relationship ${side}Column must belong to the through table.`,
    );
  }

  return entry[0];
}

export type Relationship = {
  kind: "manyToMany";
  through: AnyPgTable & { relationship: RelationshipColumn };
  from: RuntimeRelationshipTable;
  to: RuntimeRelationshipTable;
  fromColumn: RelationshipColumn;
  toColumn: RelationshipColumn;
  fromColumnKey: string;
  toColumnKey: string;
  relationship: string;
  fromPrimaryKey: RelationshipColumn;
  toPrimaryKey: RelationshipColumn;
  label?: RelationshipColumn | SQL;
  search?: readonly (RelationshipColumn | SQL)[];
  orderBy?: readonly SQL[];
};
