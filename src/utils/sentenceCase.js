import startCase from "lodash/startCase";

export default function sentenceCase(str) {
  if (!str) {
    return str;
  }

  str = startCase(str);
  str = str.toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}
