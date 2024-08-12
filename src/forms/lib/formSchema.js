export default class formSchema {
  #fields = null;

  constructor(fieldTree) {
    this.fieldTree = fieldTree;
  }

  [Symbol.iterator]() {
    return Object.entries(this.fieldTree)[Symbol.iterator]();
  }

  getFields() {
    if (this.#fields) {
      return this.#fields;
    }

    this.#fields = this.#flattenFields(this.fieldTree);
    return this.#fields;
  }

  #flattenFields(object, retval = {}) {
    for (const [key, value] of Object.entries(object)) {
      if (value.fields) {
        this.#flattenFields(value.fields, retval);
      } else {
        retval[key] = value;
      }
    }
    return retval;
  }
}
