import type { Metadata } from "next";

import { cache } from "react";

import { getCollection } from "@kenstack/lib/db";

import * as z from "zod";

const schema = z.object({
  title: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  content: z.string().nullable(),
});

type Content = z.infer<typeof schema>;

export const loadMD = cache(async (localPath: string): Promise<Content> => {
  const Content = await getCollection("content");

  const doc = await Content.findOne({
    slug: localPath,
  });

  if (doc) {
    return schema.partial().parse(doc);
  }

  return {
    seoTitle: "GiveRound",
  };
});

export const loadMeta = async (key: string): Promise<Metadata> => {
  const { title, seoTitle } = await loadMD(key);

  const retval: Metadata = {};
  if (seoTitle) {
    retval.title = {
      absolute: seoTitle,
    };
  } else if (title) {
    retval.title = title;
  }

  return retval;
};
