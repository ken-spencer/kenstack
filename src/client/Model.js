import formSchema from "@kenstack/forms/formSchema";
import sentenceCase from "../utils/sentenceCase";

import DateRelative from "../components/Date/Relative";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";

export default function clientModel(data) {
  if (typeof this === "undefined" || !(this instanceof clientModel)) {
    return new clientModel(data);
  }

  let $list;
  this.form = formSchema(data.fields);

  this.modelName = data.modelName;
  this.title = data.title || sentenceCase(this.modelName);
  this.icon = data.icon || DocumentIcon;
  this.preview = data.preview || null;
  this.revalidates = data.revalidates || [];
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
        title: "Created",
        component: DateRelative,
        width: "auto",
      },
    ]);

    listArray.forEach(([field_name, options = {}]) => {
      options = {
        name: null,
        title: undefined,
        sortable: true,
        wrap: false,
        filter: null,
        component: null,
        ...options,
      };

      if (options.title === undefined) {
        options.title = sentenceCase(field_name);
      }

      options.name = field_name;
      list.push(options);
    });

    $list = list;
    return list;
  };

  //   this.getFields = function () {
  //     return this.data.fields;
  //   };

  //   this.getAdminPaths = function () {
  //     const fields = this.getFields();
  //     const select = ["_id", "meta.createdAt", "meta.updatedAt"];
  //     flatten(select, fields);

  //     return select;
  //   };

  this.getPaths = function () {
    const fields = Object.keys(this.form.fields);
    const select = ["_id", "meta.createdAt", "meta.updatedAt", ...fields];
    // flatten(select, fields);

    return select;
  };
}

clientModel.prototype = {
  constructor: clientModel,
};
