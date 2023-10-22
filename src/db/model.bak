import sentenceCase from "@thaumazo/forms/utils/sentenceCase";
import pick from "lodash/pick";

class Model {
  collection = "pages"; // which collection to store this entity in
  public = false; // posible to add pages of this layout type
  single = false; // only one record allowd. good for settings etc
  fields = new Map();
  defaults = {}; // default values for form fields
  list = new Map();
  children = new Map();

  constructor(options) {
    this._addGroups(options.groups);
    this._addFields(options.fields);
    this._addList(options);

    if (options.name && !options.path && options.path !== false) {
      options.path = "/" + options.name;
    }

    Object.assign(this, pick(options, ["collection", "path", "single"]));
  }

  init(name) {
    this.name = name;
    if (!this.label) {
      this.label = sentenceCase(name);
    }
  }

  _addFields(fields) {
    if (!fields) {
      return;
    }

    fields = fields.map(([name, options]) => {
      // To do - convert to sentence case
      const defaults = {
        name,
        label: sentenceCase(name),
        type: "text",
      };

      options = options ? { ...defaults, ...options } : defaults;
      this.defaults[name] = options.default;

      const group = this.groups.get(options.group);
      if (group) {
        const f = group.fields;
        f.set(name, options);
      }
      return [name, options];
    });

    this.fields = new Map(fields);
  }

  _addGroups(groups) {
    if (!groups) {
      return;
    }

    groups = groups.map(([name, options]) => {
      // To do - convert to sentence case
      const defaults = {
        name,
        label: sentenceCase(name),
        fields: new Map(),
      };

      options = options ? { ...defaults, ...options } : defaults;
      return [name, options];
    });

    this.groups = new Map(groups);
  }

  _addList({ list }) {
    if (!list) {
      this.single = true;
      return;
    }

    list.forEach(([field_name, options = {}]) => {
      if (!options.label) {
        options.label = sentenceCase(field_name);
      }
      options.fieldName = field_name;

      this.list.set(field_name, options);
    });
  }

  child(name, config) {
    this.children.push(new Model(config));
    return this;
  }
}

export default function model(options) {
  return new Model(options);
}

/* Syntax ideas

// declare layout variations for

{
  fields: [
    ["my_field", {
      layouts: ['layout1', 'layout2'] // show field only in these layouts
    },
  ]
  layouts: [
    ['layout1', {}],
    ['layout2', {}],
    ['layout3', {}],
  ]
}
*/
