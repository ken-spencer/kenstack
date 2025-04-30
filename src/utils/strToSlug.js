export default function strToSlug(value, interacting = false) {
  let retval = value
    // .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // replace spaces
    .replace(/[^\w-]+/g, "") // remove not word characters
    .replace(/--+/g, "-"); // ensure only single hyphens

  // we need to limit some rules if manually editing to allow space to convert to -
  if (interacting === false) {
    retval = retval.replace(/^-+|-+$/g, ""); // remove hypen from start and end.
  }

  return retval;
}
