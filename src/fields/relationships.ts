import type { SQL } from "drizzle-orm";
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

type RelationshipInputBase = {
  through: object;
  from: RelationshipTable<string, string>;
  to: RelationshipTable<string, string>;

  fromColumn?: unknown;
  toColumn?: unknown;

  relationship?: string;

  label?: RelationshipColumn | SQL;
  search?: readonly (RelationshipColumn | SQL)[];
  orderBy?: readonly SQL[];
};

type RelationshipInputMap = Record<string, RelationshipInputBase>;

export function defineRelationships<
  const TRelationships extends RelationshipInputMap,
>(relationships: TRelationships) {
  const expanded = Object.fromEntries(
    Object.entries(relationships).map(([key, relationship]) => {
      const fromColumnName = `${relationship.from[relationshipName]}Id`;
      const toColumnName = `${relationship.to[relationshipName]}Id`;
      const relationshipValue =
        relationship.relationship ?? pluralize.singular(key);

      return [
        key,
        {
          ...relationship,
          kind: "manyToMany",
          relationship: relationshipValue,
          fromColumnKey: fromColumnName,
          toColumnKey: toColumnName,
          fromColumn:
            relationship.fromColumn ??
            relationship.through[
              fromColumnName as keyof typeof relationship.through
            ],
          toColumn:
            relationship.toColumn ??
            relationship.through[
              toColumnName as keyof typeof relationship.through
            ],
          fromPrimaryKey: relationship.from.id,
          toPrimaryKey: relationship.to.id,
        },
      ];
    }),
  );

  return expanded as {
    [TKey in keyof TRelationships]: Relationship;
  };
}

type RuntimeRelationshipTable = AnyPgTable & RelationshipTable<string, string>;

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

export type Relationships = Record<string, Relationship>;
