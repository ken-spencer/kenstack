import { and, eq, isNull, type SQL, type Subquery } from "drizzle-orm";
import type {
  PgSelectBase,
  PgSelectWithout,
  PgTable,
  SelectedFields,
} from "drizzle-orm/pg-core";
import type {
  AppendToNullabilityMap,
  GetSelectTableName,
  JoinNullability,
} from "drizzle-orm/query-builders/select.types";

import { db } from "@app/db";
import type { AdminContentTable } from "@kenstack/admin/table";

// Later keys win, like object spread. Flattened, because an intersection does not equal the selection
// Drizzle infers for the same literal.
type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : A[K & keyof A];
};

type Join = {
  on: SQL | undefined;
  table: PgTable | Subquery;
  type: "inner" | "left";
};

// Collects clauses in any order and any number of times: selections merge, conditions are ANDed and
// joins accumulate. Drizzle's own where() replaces its condition, so the Drizzle query is built only
// by build(), whose result leaves where() out.
class Query<
  TTable extends PgTable,
  TSelection extends SelectedFields,
  TNullability extends Record<string, JoinNullability>,
> {
  constructor(
    private readonly table: TTable,
    private readonly selection: SelectedFields,
    private readonly conditions: SQL[],
    private readonly joins: Join[],
  ) {}

  select<TFields extends SelectedFields>(fields: TFields) {
    return new Query<TTable, Merge<TSelection, TFields>, TNullability>(
      this.table,
      { ...this.selection, ...fields },
      this.conditions,
      this.joins,
    );
  }

  where(condition: SQL | undefined) {
    return new Query<TTable, TSelection, TNullability>(
      this.table,
      this.selection,
      condition ? [...this.conditions, condition] : this.conditions,
      this.joins,
    );
  }

  innerJoin<TJoined extends PgTable | Subquery>(
    table: TJoined,
    on: SQL | undefined,
  ) {
    return new Query<
      TTable,
      TSelection,
      AppendToNullabilityMap<TNullability, GetSelectTableName<TJoined>, "inner">
    >(this.table, this.selection, this.conditions, [
      ...this.joins,
      { on, table, type: "inner" },
    ]);
  }

  leftJoin<TJoined extends PgTable | Subquery>(
    table: TJoined,
    on: SQL | undefined,
  ) {
    return new Query<
      TTable,
      TSelection,
      AppendToNullabilityMap<TNullability, GetSelectTableName<TJoined>, "left">
    >(this.table, this.selection, this.conditions, [
      ...this.joins,
      { on, table, type: "left" },
    ]);
  }

  // Drizzle's select, so orderBy, limit and await work as usual. It leaves out where() through every
  // chained call, and the methods that would bring it back ($dynamic(), $withCache() and the set
  // operators), so its own methods cannot replace the combined conditions. Drizzle's standalone set
  // operator functions, such as union(built, other), still accept it.
  build(): PgSelectWithout<
    PgSelectBase<TTable["_"]["name"], TSelection, "partial", TNullability>,
    false,
    | "$dynamic"
    | "$withCache"
    | "except"
    | "exceptAll"
    | "intersect"
    | "intersectAll"
    | "union"
    | "unionAll"
    | "where"
  > {
    const built = db
      .select(this.selection)
      .from<PgTable>(this.table)
      .$dynamic();
    for (const { on, table, type } of this.joins) {
      if (type === "inner") {
        built.innerJoin(table, on);
      } else {
        built.leftJoin(table, on);
      }
    }
    built.where(and(...this.conditions));

    // The type tracks the selection and join nullability Drizzle infers for the same hand-written
    // query; tests/types/queries.ts checks that the two stay equal.
    return built as never;
  }
}

export function query<TTable extends PgTable>(table: TTable) {
  return new Query<
    TTable,
    Record<never, never>,
    Record<TTable["_"]["name"], "not-null">
  >(table, {}, [], []);
}

// Published and not deleted, without the publication-time check, which a cached query would freeze
// at the moment it ran. Works in a join condition as well as a where clause.
export function isVisible(table: AdminContentTable) {
  return and(isNull(table.deletedAt), eq(table.visibility, "published"));
}
