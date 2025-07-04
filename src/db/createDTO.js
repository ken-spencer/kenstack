import isPlainObject from "lodash-es/isPlainObject";

export default function createDTO(val) {
  if (val == null) {
    return val;
  }
  const t = typeof val;

  if (
    t === "string" ||
    t === "number" ||
    t === "boolean" ||
    t === "bigint" ||
    t === "symbol" ||
    t === "undefined"
  ) {
    return val;
  }

  if (val && typeof val.toJSON === "function") {
    val = val.toJSON(); // ← now a plain JS array or object
  }

  if (val && typeof val.toObject === "function") {
    val = val.toObject(); // ← now a plain JS array or object
  }

  // arrays → recurse each element
  if (Array.isArray(val)) {
    return val.map(createDTO);
  }

  if (val && typeof val.toDTO === "function") {
    return val.toDTO();
  }

  // plain JS object → recurse its properties
  if (isPlainObject(val)) {
    return Object.fromEntries(
      Object.entries(val).map(([key, v]) => [key, createDTO(v)])
    );
  }

  if (val && typeof val.toString === "function") {
    return val.toString();
  }

  return val;
}
