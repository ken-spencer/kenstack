import { ObjectId } from "mongodb";
import util from "util";
import omit from "lodash/omit";
import pickBy from "lodash/pickBy";
import pick from "lodash/pick";

export default class Entity {
  #changes = new Set();
  #doc = {};

  constructor(doc = null) {
    if (doc) {
      this.#doc = { ...this.constructor.defaults, ...doc };
    } else {
      this.#doc = {
        _id: new ObjectId(),
        ...this.constructor.defaults,
      };
    }
  }

  static init() {
    this.defaults = {};
    // add getters / setters
    this.model.fields.forEach((field) => {
      this.defaults[field.name] = field.default;

      Object.defineProperty(this.prototype, field.name, {
        configurable: false, // deletable/redefinable?
        get() {
          return this.#doc[field.name];
        },
        set(value) {
          if (this.#doc[field.name] !== value) {
            this.#doc[field.name] = value;
            this.#changes.add(field.name);
          }
        },
      });
    });
  }

  // customize output when loggoing Entity to console
  [util.inspect.custom](depth, opts) {
    const obj = this.toObject();
    return this.constructor.name + " " + util.inspect(obj, opts);
  }

  toObject() {
    const retval = {
      id: this.id,
      ...omit(this.#doc, ["_id"]),
    };
    return retval;
  }

  toJSON() {
    const obj = pickBy(this.toObject(), (x) => x !== undefined);
    return obj;
  }

  get id() {
    return this.#doc._id.toHexString();
  }

  set id(value) {
    this.#doc._id = new ObjectId(value);
  }

  static findOne(query) {
    return this.collection.findOne(query).then((doc) => {
      if (!doc) {
        return doc;
      }

      return new this(doc);
    });
  }

  static findById(id) {
    const query = { _id: ObjectId(id) };
    return this.findOne(query);
  }

  /*
  // For this to work, we need to find a way to replace what is returned by the cursor with
  // our Entity. Most of the existing ORM's appear to do this by replacing the cursor
  static find(query) {
    const cursor = this.collection.find(query)

    //   return new this.constructor(doc)
    cursor.on("data", data => {
      return data
    })

    return cursor
  }
  */

  // (TODO) static method to substitute db columns for display
  static view({ _id, ...row }) {
    const retval = {
      id: _id.toHexString(),
      ...row,
    };

    return retval;
  }

  merge(values) {
    values = omit(values, ["id"]);
    Object.assign(this, values);
  }

  validate() {}

  save() {
    if (!this.#changes.size) {
      return false;
    }

    const changes = pick(this.#doc, [...this.#changes]);
    this.#changes = new Set();
    const _id = this.#doc._id;
    return this.constructor.collection.updateOne({ _id }, { $set: changes });
  }
}
