import sentenceCase from "../utils/sentenceCase";

import DateRelative from "../components/Date/Relative";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";

export default class admin {
  static path = process.env.NEXT_PUBLIC_ADMIN_PATH || "/admin";
  static models = new Map();
  static navigation = new Map();

  constructor() {
    throw Error("admin is a static class and cannot be instantiated");
  }

  static add(modelName, path, adminData, options = {}) {
    const adminObj = new AdminData(adminData);
    adminObj.modelName = modelName;
    adminObj.path = path;
    adminObj.title = options.title || sentenceCase(modelName);

    admin.models.set(modelName, adminObj);

    /*
    if (admin.navigation.has(path)) {
      throw Error("Admin navigation has already been defined for: " + path);
    }
    admin.navigation.set(path, options);
    */
  }

  static get(name) {
    return admin.models.get(name);
    /*
    const options = admin.models.get(name); 
    if (!options) {
      return false;
    }

    if (options.admin) {
      return options.admin;
    }

    const data = await options.adminPromise();
    const adminObj = new AdminData(data);
    adminObj.modelName = options.modelName;

    options.admin = adminObj;
    return adminObj;
    */
  }
  static getByPath(path) {
    for (let obj of admin.models.values()) {
      if (obj.path === path) {
        return admin.get(obj.modelName);
      }
    }
  }

  static getDefault() {
    const values = admin.models.values();
    return values.next()?.value;
  }

  static pathName(pathArg) {
    let path = String(pathArg);
    if (path.at(0) !== "/") {
      path = "/" + path;
    }

    if (admin.path === "/") {
      return path;
    }

    return admin.path + path;
  }
}

class AdminData {
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
