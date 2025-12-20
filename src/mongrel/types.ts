export type RevalidateDoc = { id?: string; slug?: string };
export type RevalidateKey = string | ((doc: RevalidateDoc) => string);
