import mongoose from "../db";

// import DateRelative from "../components/Date/Relative";

//import merge from "lodash/merge";
import pick from "lodash/pick";
// import get from "lodash/get";

const { Schema } = mongoose;
import Trash from "../models/Trash";

import formSchema from "@thaumazo/forms/lib/formSchema";
import validity from "./validate";
import checkServerValidity from "@thaumazo/forms/validity/checkServerValidity";
import errorLog from "../log/error";
import auditLog from "../log/audit";
import audit from "./audit";
import loadUser from "../auth/loadUser";

class AdminSchema extends Schema {
  // _admin = null;

  constructor(schema, inputOptions = {}) {
    const options = {
      timestamps: {
        createdAt: "meta.createdAt",
        updatedAt: "meta.updatedAt",
      },
      ...inputOptions,
    };

    super(schema, options);

    // this.statics.getAdminData = getAdminData;
    this.statics.trashMany = trashMany;
    this.methods.bindFormData = bindFormData;
    this.methods.checkValidity = checkValidity;
    this.methods.trash = trash;
    this.methods.toAdminDTO = toAdminDTO;

    audit(this);
  }

  /*
  #adminDefaults = {
    label: null,
    fields: [],
    list: null,
  };
  */

  /*
  admin(userOptions = {}) {
    this._admin = merge({}, this.adminDefaults, userOptions);

    return this;
  }
  */

  /*
  adminList(listArray, configs = {}) {
    if (this._admin === null) {
      throw Error(".admin() must be called prior to .adminList()");
    }

    listArray.push([
      "meta.createdAt", 
      { 
        label: "Created",
        // component: DateRelative,
      }
    ]);

    const list = new AdminList(configs);
    listArray.forEach(([field_name, options = {}]) => {
      options = {
        name: null,
        label: null,
        sortable: true,
        wrap: false,
        ...options,
      };

      if (!options.label) {
        options.label = sentenceCase(field_name);
      }

      options.name = field_name;
      list.push(options);
    });

    this._admin.list = list;
    return this;
  }
  */

  /*
  adminFields(configs) {
    this._admin.fields = configs;
    return this;
  }
  */

  /*
  getAdmin() {
    return this._admin;
  }
  */
}

/*
class AdminList extends Array {
  sortBy = ["createdAt", "asc"];

  constructor(options) {
    super();
    options = pick(options, ["sortBy"]);
    merge(this, options);
  }
  l;
}
*/
/*
function getAdminData() {
  const admin = this.schema.getAdmin();
  const data = {
    modelName: this.modelName,
  };
  merge(data, admin);
  return data;
}
*/

/*
function getAdminPaths() {
  const { fields } = this.schema.getAdmin();
  const select = ["_id", "meta.createdAt", "meta.updatedAt"];
  flatten(select, fields);

  return select;
}
*/

function toAdminDTO(paths = null) {
  const json = this.toJSON();
  // const paths = this.constructor.getAdminPaths();
  const obj = paths ? pick(json, ["_id", ...paths]) : json;

  // There has to be a better way to do this.
  const retval = JSON.parse(JSON.stringify(obj));
  return retval;
}

async function bindFormData(fieldTree, formData) {
  if (!(formData instanceof FormData)) {
    throw Error("invalid FormData supplied to bindFormData() ");
  }

  let fieldErrors = checkServerValidity(fieldTree, formData);
  if (fieldErrors) {
    return {
      error:
        "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    };
  }

  const schema = new formSchema(fieldTree);
  const fields = schema.getFields();

  for (let name in fields) {
    let field = fields[name];

    if (name.readOnly) {
      continue;
    }

    if (field.field === "checkboxList") {
      // get the values of a checkbox list as an array.
      this.set(name, formData.getAll(name));
    } else if (field.field === "checkbox") {
      this.set(name, formData.get(name));
    } else {
      // if (!formData.has(name)) {
      // Will this result in adata loss?
      this.set(name, formData.get(name) || "");
    }
  }

  try {
    fieldErrors = await this.checkValidity();
  } catch (e) {
    errorLog(e, "Problem validating: " + this.constructor.modelName);
    return { error: "There was an unexpected problem saving your information" };
  }

  if (fieldErrors) {
    return {
      error:
        "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    };
  }
}

async function checkValidity() {
  return await validity(this);
}

// Copy to Trash and then delete.
async function trash() {
  const doc = new Trash({
    modelId: this._id,
    modelName: this.constructor.modelName,
    document: this,
  });

  await doc.save();

  const model = this.constructor;
  await model.deleteOne({ _id: this._id });
}

async function trashMany(arrayToTrash) {
  const user = await loadUser();

  if (arrayToTrash instanceof Set) {
    arrayToTrash = Array.from(arrayToTrash);
  }

  if (user) {
    arrayToTrash = arrayToTrash.filter((val) => val != user._id);
  }

  if (arrayToTrash.length == 0) {
    return 0;
  }

  const docs = await this.find({ _id: { $in: arrayToTrash } });

  const trash = docs.map((doc) => ({
    modelId: doc._id,
    modelName: doc.constructor.modelName,
    document: doc,
  }));

  await Trash.insertMany(trash);

  const retval = await this.deleteMany({ _id: { $in: arrayToTrash } });

  auditLog(
    "trashMany",
    "Deleted many",
    {
      modelName: this.modelName,
      records: arrayToTrash,
    },
    user,
  );

  return retval;
}

/*
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
*/

export default AdminSchema;
