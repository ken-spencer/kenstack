import sentenceCase from "../utils/sentenceCase";

import DateRelative from "../components/Date/Relative";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";

export default function clientModel(data) {
  if (typeof this === "undefined" || !(this instanceof clientModel)) {
    return new clientModel(data);
  }

  let $list;

  this.modelName = data.modelName;
  this.title = data.title || sentenceCase(this.modelName);
  this.icon = data.icon || DocumentIcon;
  this.data = data;

  this.getList = function () {
    if (!this.data.list) {
      return null;
    }

    if ($list) {
      return $list;
    }

    let list = [];
    const listArray = [...this.data.list];
    listArray.push([
      "meta.createdAt",
      {
        label: "Created",
        component: DateRelative,
        width: "auto",
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

    $list = list;
    return list;
  };

  this.getFields = function () {
    return this.data.fields;
  };

  this.getAdminPaths = function () {
    const fields = this.getFields();
    const select = ["_id", "meta.createdAt", "meta.updatedAt"];
    flatten(select, fields);

    return select;
  };

  this.getPaths = function () {
    const fields = this.getFields();
    const select = ["_id", "meta.createdAt", "meta.updatedAt"];
    flatten(select, fields);

    return select;
  };
}

clientModel.prototype = {
  constructor: clientModel,
};

/*
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
        width: "auto",
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
*/

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
