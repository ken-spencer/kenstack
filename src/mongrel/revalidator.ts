import { revalidateTag } from "next/cache";
import { ObjectId } from "mongodb";

import { type Mongrel } from ".";
import { type RevalidateKey, type RevalidateDoc } from "./types";

export type Revalidator = {
  onCreate?(): void;
  onUpdate?(id: ObjectId, post: RevalidateDoc): Promise<void>;
  onDelete?(idArray: ObjectId[]): void | Promise<void>;
};

class RevalidateNext implements Revalidator {
  constructor(
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly model: Mongrel<any>,
    private tags: RevalidateKey[]
  ) {}

  onCreate() {
    this.revalidate();
  }

  /** run before update. */
  async onUpdate(id: ObjectId, post: RevalidateDoc) {
    if ("slug" in this.model.schema.shape) {
      const doc = await this.model.findOne(
        { _id: id },
        { projection: { slug: 1 } }
      );

      if (doc) {
        if ("slug" in post && post.slug !== doc.slug) {
          this.revalidateDoc({ id: id.toHexString(), slug: post.slug });
        }
        this.revalidateDoc({ id: id.toHexString(), slug: doc.slug });
      }
    } else {
      this.revalidateDoc({ id: id.toHexString() });
    }

    this.revalidate();
  }

  async onDelete(idArray: ObjectId[]) {
    if (idArray.length === 0) {
      return;
    }

    if ("slug" in this.model.schema.shape) {
      const docs = await this.model.find(
        { _id: { $in: idArray } },
        { projection: { slug: true } }
      );

      docs.forEach((doc) => {
        this.revalidateDoc({ id: doc._id.toHexString(), slug: doc.slug });
      });
    } else {
      idArray.forEach((id) => {
        this.revalidateDoc({ id: id.toHexString() });
      });
    }
    this.revalidate();
  }

  private revalidateDoc(doc: RevalidateDoc): void {
    this.tags.forEach((arg) => {
      if (typeof arg === "function") {
        revalidateTag(arg(doc), "max");
      }
    });
  }
  private revalidate(): void {
    this.tags.forEach((arg) => {
      if (typeof arg === "string") {
        revalidateTag(arg, "max");
      }
    });
  }
}

export default function revalidator(
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Mongrel<any>,
  tags: RevalidateKey[]
) {
  return new RevalidateNext(model, tags);
}
