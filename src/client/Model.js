import sentenceCase from "../utils/sentenceCase";

import DateRelative from "../components/Date/Relative";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";

export default class clientModel {
  #list;

  constructor(data) {
    this.modelName = data.modelName;
    this.title = data.title || sentenceCase(this.modelName);
    this.icon = data.icon || DocumentIcon;
    this.data = data;
  }

  getList() {
    if (!this.data.list) {
      return null;
    }

    if (this.#list) {
      return this.#list;
    }

    let list = [];
    const listArray = [...this.data.list];
    listArray.push([
      "meta.createdAt",
      {
        label: "Created",
        component: DateRelative,
      },
    ]);

    listArray.forEach(([field_name, options = {}]) => {
      options = {
        name: null,
        label: null,
        sortable: true,
        wrap: false,
        filter: null,
        component: null,
        ...options,
      };

      if (!options.label) {
        options.label = sentenceCase(field_name);
      }

      options.name = field_name;
      list.push(options);
    });

    this.#list = list;
    return list;
  }

  getFields() {
    return this.data.fields;
  }

  getAdminPaths() {
    const fields = this.getFields();
    const select = ["_id", "meta.createdAt", "meta.updatedAt"];
    flatten(select, fields);

    return select;
  }

  getPaths() {
    const fields = this.getFields();
    const select = ["_id", "meta.createdAt", "meta.updatedAt"];
    flatten(select, fields);

    return select;
  }
}

function flatten(retval, object) {
  for (const [key, value] of Object.entries(object)) {
    if (value.fields) {
      flatten(retval, value.fields);
    } else {
      retval.push(key);
    }
  }
  return retval;
}
