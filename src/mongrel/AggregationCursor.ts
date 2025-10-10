import type { Document, AggregateOptions, AggregationCursor } from "mongodb";
import { getCollection } from "@kenstack/lib/db";

class MongrelAggregationCursor<T> {
  private _cursor?: AggregationCursor<T>;
  constructor(
    private readonly collectionName: string,
    private readonly pipeline: Document[],
    private readonly options?: AggregateOptions
  ) {}

  /** Lazily create the underlying driver cursor once */
  private async cursor(): Promise<AggregationCursor<T>> {
    if (!this._cursor) {
      const coll = await getCollection(this.collectionName);
      this._cursor = coll.aggregate<T>(this.pipeline, this.options);
    }
    return this._cursor;
  }

  async toArray(): Promise<T[]> {
    return (await this.cursor()).toArray();
  }

  async next(): Promise<T | null> {
    return (await this.cursor()).next();
  }
}

export default MongrelAggregationCursor;
