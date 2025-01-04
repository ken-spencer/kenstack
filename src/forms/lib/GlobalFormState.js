export default class GlobalFormState {
  pending = false;
  #props = new Map();
  initialValues = null;
  fields = new Map();
  memo = 0; // updated to refresh memo

  set error(v) {
    throw Error("error is read only");
  }
  get error() {
    return this.state?.error;
  }

  set success(v) {
    throw Error("success is read only");
  }
  get success() {
    return this.state?.success;
  }

  set changed(v) {
    throw Error("changed is read only");
  }
  get changed() {
    for (let [, field] of this.fields) {
      if (field.initialValue !== field.value) {
        return true;
      }
    }
    return false;
  }

  set invalid(v) {
    throw Error("invalid is read only");
  }
  get invalid() {
    for (let [, field] of this.fields) {
      if (field.checkValidity()) {
        return true;
      }
    }
    return false;
  }

  #state = {};
  set state(state) {
    if (!this.action && this.#state !== state) {
      this.reRender();
    }

    this.#state = state;
  }

  get state() {
    return this.#state;
  }

  constructor() {}

  init(initialValues) {
    this.fields.forEach((field, name) => {
      field.value = field.initialValue = initialValues[name] ?? "";
      field.blurred = false;
    });
  }

  reset() {
    this.init(this.initialValues);
  }

  // initProp(name, initial) {
  //   this.#props.set(name, initial);

  //   Object.defineProperty(this, name, {
  //     get: function () {
  //       return this.#props.get(name);
  //     },
  //     set: function (value) {
  //       if (this.#props.get(name) !== value) {
  //         this.memo++;
  //         this.#props.set(name, value);
  //         this.reRender();
  //       }
  //     },
  //     enumerable: true,
  //     configurable: true,
  //   });
  // }

  // subscriptions = {};
  // subscribe(fieldName, callback) {
  //   let set = this.subscriptions[fieldName];
  //   if (set === undefined) {
  //     set = this.subscriptions[fieldName] = new Set();
  //   }
  //   set.add(callback);
  // }

  // notifySubscribers(name) {
  //   const subscriptions = this.subscriptions[name];
  //   if (!subscriptions) {
  //     return false;
  //   }

  //   subscriptions.forEach((callback) => {
  //     callback();
  //   });
  // }

  //   unsubscribe(fieldName, callback) {
  //     let set = this.subscriptions[fieldName];
  //     if (set) {
  //       set.delete(callback);
  //     }
  //   }
}
