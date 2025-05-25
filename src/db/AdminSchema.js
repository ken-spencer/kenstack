import "server-only";
import mongoose from "mongoose";

import pick from "lodash-es/pick";
import get from "lodash-es/get";
// import isPlainObject from "lodash-es/isPlainObject";
import createDTO from "./createDTO";

const { Schema } = mongoose;

// import formSchema from "@kenstack/forms/formSchema";
import validity from "./validate";
import checkServerValidity from "@kenstack/forms/validity/checkServerValidity";
import errorLog from "../log/error";
import audit from "./audit";

class AdminSchema extends Schema {
  constructor(inputSchema, inputOptions = {}) {
    const schema = {
      meta: {
        deleted: {
          type: Boolean,
          default: false,
          index: true,
        },
      },
      ...inputSchema,
    };

    const options = {
      timestamps: {
        createdAt: "meta.createdAt",
        updatedAt: "meta.updatedAt",
      },
      // revalidates: [], // list of site pages to revalidate on save
      ...inputOptions,
    };

    super(schema, options);

    // this.statics.getAdminData = getAdminData;
    this.methods.bindFormData = bindFormData;
    this.methods.bindValues = bindValues;
    this.methods.checkValidity = checkValidity;
    this.methods.trash = trash;
    // this.statics.trashMany = trashMany;
    this.methods.toAdminDTO = toAdminDTO;
    this.methods.toDTO = toDTO;
    this.methods.getDTO = getDTO;

    const query = function () {
      const filter = this.getFilter();
      if (!filter["meta.deleted"] && this.options.trash !== false) {
        this.where({ "meta.deleted": { $ne: true } });
      }
    };

    this.pre("find", query);
    this.pre("findById", query);
    this.pre("findOne", query);
    this.pre("findOneAndUpdate", query);
    this.pre("findOneAndDelete", query);
    this.pre("updateOne", query);
    this.pre("updateMany", query);
    this.pre("deleteOne", query);
    this.pre("deleteMany", query);

    audit(this);
  }

  static fromClientModel(admin) {
    const fields = admin.form.getFields();

    const data = {};
    for (let [name, field] of Object.entries(fields)) {
      let type = String;
      if (
        field.field === "checkbox-list" ||
        field.field === "multi-select" ||
        field.field === "tags"
      ) {
        type = [String];
      }
      data[name] = type;
    }

    return new this(data);
  }
}

function getDTO(path) {
  return createDTO(this.get(path));
}

// export function createDTO(val) {
//   if (val == null) return val;
//   const t = typeof val;

//   if (
//     t === "string" ||
//     t === "number" ||
//     t === "boolean" ||
//     t === "bigint" ||
//     t === "symbol" ||
//     t === "undefined"
//   ) {
//     return val;
//   }

//   if (val && typeof val.toJSON === "function") {
//     val = val.toJSON(); // ← now a plain JS array or object
//   }

//   if (val && typeof val.toObject === "function") {
//     val = val.toObject(); // ← now a plain JS array or object
//   }

//   // arrays → recurse each element
//   if (Array.isArray(val)) {
//     return val.map(createDTO);
//   }

//   if (val && typeof val.toDTO === "function") {
//     return val.toDTO();
//   }

//   // plain JS object → recurse its properties
//   if (isPlainObject(val)) {
//     return Object.fromEntries(
//       Object.entries(val).map(([key, v]) => [key, createDTO(v)]),
//     );
//   }

//   if (val && typeof val.toString === "function") {
//     return val.toString();
//   }

//   return val;
// }

function toDTO() {
  const result = {};
  for (let key of Object.keys(this.schema.paths)) {
    if (key === "__v" || !this.isSelected(key)) {
      continue;
    }
    const val = this.get(key);

    result[key] = createDTO(val);
  }
  return result;
}

function toAdminDTO(admin, paths = null) {
  if (!paths) {
    paths = admin.getPaths();
  }
  const json = this.toJSON();
  // const paths = this.constructor.getAdminPaths();
  const obj = paths ? pick(json, ["_id", ...paths]) : json;
  // const fields = admin.form.getFields();

  const values = {
    _id: obj._id.toString(),
  };
  for (let name of paths) {
    // const field = fields[name];

    const options = this.schema.path(name);
    if (!options) {
      continue;
    }

    const fieldOptions = options.options;

    const value = get(obj, name);
    if (fieldOptions.onAdminDTO) {
      values[name] = fieldOptions.onAdminDTO(value);
    } else {
      values[name] = value;
    }
  }

  // There has to be a better way to do this.
  const retval = JSON.parse(JSON.stringify(values));
  return retval;
}

async function bindValues(fields, values) {
  let fieldErrors = checkServerValidity(fields, values);
  if (fieldErrors) {
    return {
      error:
        "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    };
  }
  for (let name in fields) {
    const field = fields[name];
    if (field.transient || field.readOnly || values[name] === undefined) {
      continue;
    }

    const options = this.schema.path(name);

    if (!options) {
      return { error: `Unable to save.Missing ${name} from db schema` };
    }

    const fieldOptions = options.options;

    if (fieldOptions.onBind) {
      this.set(
        name,
        fieldOptions.onBind(values[name], {
          path: name,
          field,
          options: fieldOptions,
          previous: this.get(name),
        }),
      );
    } else {
      this.set(name, values[name]);
    }
  }

  fieldErrors = await this.checkValidity();

  if (fieldErrors) {
    return {
      error:
        "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    };
  }
}

async function bindFormData(fields, formData) {
  if (!(formData instanceof FormData)) {
    throw Error("invalid FormData supplied to bindFormData() ");
  }

  let fieldErrors = checkServerValidity(fields, formData);
  if (fieldErrors) {
    return {
      error:
        "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    };
  }

  // const schema = new formSchema(fieldTree);
  // const fields = schema.getFields();

  for (let name in fields) {
    if (!this.constructor.schema.path(name)) {
      // TODO this should be an error, but we need a way to identify
      // certain fields to be ignored (confirm password etc) l
      continue;
      // throw Error(`Field ${ name } has not been declared in model ${ this.constructor.modelName }`);
    }

    let field = fields[name];

    if (name.readOnly) {
      continue;
    }

    if (
      field.field === "checkbox-list" ||
      field.field === "multi-select" ||
      field.field === "tags"
    ) {
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
  this.set("meta.deleted", true);
  await this.save();
}

/*
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
*/
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
