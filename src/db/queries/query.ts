import {
  and,
  eq,
  getTableColumns,
  getTableName,
  is,
  isNotNull,
  isNull,
  type SQL,
  type Subquery,
} from "drizzle-orm";
import {
  PgTable,
  type LockConfig,
  type LockStrength,
  type PgColumn,
  type PgAsyncSelectBase,
  type SelectedFields,
} from "drizzle-orm/pg-core";
import type {
  AppendToNullabilityMap,
  GetSelectTableName,
  JoinNullability,
  SelectResult,
} from "drizzle-orm/query-builders/select.types";

import { db } from "@app/db";
import type { AdminContentTable } from "@kenstack/admin/table";
import type { Database, DbTransaction } from "@kenstack/db/types";

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

type Clauses = {
  conditions: SQL[];
  db: Database | DbTransaction;
  groupBy: Expression[];
  joins: Join[];
  limit?: number;
  lock?: { config?: LockConfig; strength: LockStrength };
  orderBy: Expression[];
  selection: SelectedFields;
  trash?: "include" | "only";
};

type Expression = PgColumn | SQL | SQL.Aliased;

// Collects clauses in any order and any number of times: selections merge, conditions are ANDed,
// joins, orderBy and groupBy accumulate, and the last limit and lock win. Awaiting it runs the
// query on the database or the transaction passed as `db`, and Drizzle embeds it as a subquery,
// such as in exists(). By default it leaves out the trashed rows of the table and of every table it
// joins, so a left join finds none for them. `trash: "include"` leaves out none, and
// `trash: "only"` keeps only the table's trashed rows; neither filters a join.
class Query<
  TTable extends PgTable,
  TSelection extends SelectedFields,
  TNullability extends Record<string, JoinNullability>,
> implements PromiseLike<SelectResult<TSelection, "partial", TNullability>[]> {
  constructor(
    private readonly table: TTable,
    private readonly clauses: Clauses,
  ) {}

  select<TFields extends SelectedFields>(fields: TFields) {
    return new Query<TTable, Merge<TSelection, TFields>, TNullability>(
      this.table,
      { ...this.clauses, selection: { ...this.clauses.selection, ...fields } },
    );
  }

  where(condition: SQL | undefined) {
    return new Query<TTable, TSelection, TNullability>(this.table, {
      ...this.clauses,
      conditions: condition
        ? [...this.clauses.conditions, condition]
        : this.clauses.conditions,
    });
  }

  innerJoin<TJoined extends PgTable | Subquery>(
    table: TJoined,
    on: SQL | undefined,
  ) {
    return new Query<
      TTable,
      TSelection,
      AppendToNullabilityMap<TNullability, GetSelectTableName<TJoined>, "inner">
    >(this.table, {
      ...this.clauses,
      joins: [...this.clauses.joins, { on, table, type: "inner" }],
    });
  }

  leftJoin<TJoined extends PgTable | Subquery>(
    table: TJoined,
    on: SQL | undefined,
  ) {
    return new Query<
      TTable,
      TSelection,
      AppendToNullabilityMap<TNullability, GetSelectTableName<TJoined>, "left">
    >(this.table, {
      ...this.clauses,
      joins: [...this.clauses.joins, { on, table, type: "left" }],
    });
  }

  orderBy(...columns: Expression[]) {
    return new Query<TTable, TSelection, TNullability>(this.table, {
      ...this.clauses,
      orderBy: [...this.clauses.orderBy, ...columns],
    });
  }

  groupBy(...columns: Expression[]) {
    return new Query<TTable, TSelection, TNullability>(this.table, {
      ...this.clauses,
      groupBy: [...this.clauses.groupBy, ...columns],
    });
  }

  limit(limit: number) {
    return new Query<TTable, TSelection, TNullability>(this.table, {
      ...this.clauses,
      limit,
    });
  }

  for(strength: LockStrength, config?: LockConfig) {
    return new Query<TTable, TSelection, TNullability>(this.table, {
      ...this.clauses,
      lock: { config, strength },
    });
  }

  then<
    TResult1 = SelectResult<TSelection, "partial", TNullability>[],
    TResult2 = never,
  >(
    onfulfilled?:
      | ((
          rows: SelectResult<TSelection, "partial", TNullability>[],
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.toDrizzle().then(onfulfilled, onrejected);
  }

  getSQL() {
    return this.toDrizzle().getSQL();
  }

  private toDrizzle(): PgAsyncSelectBase<
    TTable["_"]["name"],
    TSelection,
    "partial",
    TNullability
  > {
    const {
      conditions,
      db,
      groupBy,
      joins,
      limit,
      lock,
      orderBy,
      selection,
      trash,
    } = this.clauses;
    const built = db.select(selection).from<PgTable>(this.table).$dynamic();
    for (const { on, table, type } of joins) {
      const joinOn = trash ? on : and(on, notTrashed(table));
      if (type === "inner") {
        built.innerJoin(table, joinOn);
      } else {
        built.leftJoin(table, joinOn);
      }
    }
    built.where(and(...conditions, trashCondition(this.table, trash)));
    if (groupBy.length) {
      built.groupBy(...groupBy);
    }
    if (orderBy.length) {
      built.orderBy(...orderBy);
    }
    if (limit !== undefined) {
      built.limit(limit);
    }
    if (lock) {
      built.for(lock.strength, lock.config);
    }

    // The type tracks the selection and join nullability Drizzle infers for the same hand-written
    // query; tests/types/queries.ts checks that the two stay equal.
    return built as never;
  }
}

// The condition that leaves out a table's trashed rows; none for a table without a trash or a subquery.
function notTrashed(table: PgTable | Subquery) {
  if (!is(table, PgTable)) {
    return undefined;
  }
  const { deletedAt } = getTableColumns(table);
  return deletedAt ? isNull(deletedAt) : undefined;
}

function trashCondition(table: PgTable, trash: Clauses["trash"]) {
  if (trash === "include") {
    return undefined;
  }
  if (trash === undefined) {
    return notTrashed(table);
  }
  const { deletedAt } = getTableColumns(table);
  // A trash view built on a table without a trash would otherwise list every live row as trashed.
  if (!deletedAt) {
    throw new Error(`${getTableName(table)} has no trash`);
  }
  return isNotNull(deletedAt);
}

export function query<TTable extends PgTable>(
  table: TTable,
  options: { db?: Database | DbTransaction; trash?: Clauses["trash"] } = {},
) {
  return new Query<
    TTable,
    Record<never, never>,
    Record<TTable["_"]["name"], "not-null">
  >(table, {
    conditions: [],
    db: options.db ?? db,
    groupBy: [],
    joins: [],
    orderBy: [],
    selection: {},
    trash: options.trash,
  });
}

// Published and not deleted, without the publication-time check, which a cached query would freeze
// at the moment it ran. Works in a join condition as well as a where clause.
export function isVisible(table: AdminContentTable) {
  return and(isNull(table.deletedAt), eq(table.visibility, "published"));
}
