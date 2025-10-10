import { basename, extname } from "path";

import unsecureId from "@kenstack/admin/utils/unsecureId";

export default function normalizeFilename(filename: string) {
  const retval = basename(filename, extname(filename))
    .trim()
    .replace(/[\s\._]+/g, "-") // remove spaces
    .replace(/[^\w\-.]/g, "") // remove any non word characters
    // .replace(/^-+|-+$/g, "") // remove dash from beginning or end
    .replace(/^\W+|\W+$/g, "") // trim non word characters from beginning | end
    .replace(/--{2,}/g, "-") // remove any double dashes
    .toLowerCase();

  if (retval.length === 0) {
    return unsecureId();
  }

  return retval;
}
