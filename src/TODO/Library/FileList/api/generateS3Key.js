import { basename, extname } from "path";

import { customAlphabet } from "nanoid/non-secure";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 15);

export default function generateS3Key(name) {
  const lowerName = name.toLowerCase();

  let ext = extname(lowerName);
  let base = basename(lowerName, ext)
    .replace(/(\s|_)+/g, "-")
    .replace(/[^\w\-.]/g, "") // remove any non word characters
    .replace(/--{2,}/g, "-") // remove any double dashes
    .replace(/^\W+|\W+$/g, ""); // trim non word characters from beginning | end
  if (base.length === 0) {
    base = nanoid();
  }

  return {
    prefix: nanoid(),
    filename: base + ext,
  };
}
