import createFormStore from "./lib/formStore";

class formSchema {
  constructor(fieldTree) {
    this.fieldTree = fieldTree;
    this.fields = this.#flattenFields(fieldTree);
  }

  createStore(props = {}) {
    return createFormStore(this, props);
  }

  [Symbol.iterator]() {
    return Object.entries(this.fields)[Symbol.iterator]();
  }

  getFields() {
    return this.fields;
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

// Call our class without needing the new keyword
function formSchemaFactory(...args) {
  return new formSchema(...args);
}

// ensure instanceof still works.
formSchemaFactory.prototype = formSchema.prototype;

export default formSchemaFactory;
