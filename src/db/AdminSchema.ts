import "server-only";
import mongoose from "mongoose";

import pick from "lodash-es/pick";
import get from "lodash-es/get";
// import isPlainObject from "lodash-es/isPlainObject";
import createDTO from "./createDTO";

// const { Schema } = mongoose;

import validity from "./validate";
import checkServerValidity from "@kenstack/forms/validity/checkServerValidity";
// import errorLog from "../log/error";
import audit from "./audit";

import {
  Document,
  Model,
  Schema as MongooseSchema,
  type HydratedDocument,
} from "mongoose";

// interface FieldErrors {
//   [field: string]: string | string[];
// }
type FieldErrors = Partial<Record<string, string | string[]>>;

interface BindResult {
  error: string;
  fieldErrors?: FieldErrors;
}

export interface AdminSchemaMethods {
  bindValues(
    fields: Record<string, unknown>,
    values: Record<string, unknown>
  ): Promise<BindResult | void>;

  checkValidity(): Promise<FieldErrors | undefined>;

  trash(): Promise<void>;

  toDTO(paths?: string[]): Record<string, unknown>;

  toAdminDTO(adminInstance: unknown, paths?: string[]): Record<string, unknown>;

  /** Return a DTO for a single nested path. */
  getDTO(path: string): unknown;
}

// export interface AdminDocument extends Document, AdminSchemaMethods {}
// export type AdminModel<T = AdminDocument> = Model<T>;

export type AdminDocument<DocRaw extends Document = Document> =
  HydratedDocument<DocRaw, AdminSchemaMethods>;

type DefaultQueryHelpers =
  Model<unknown> extends Model<unknown, infer QH, unknown, unknown>
    ? QH
    : never;

export type AdminModel<DocRaw extends Document = Document> = Model<
  AdminDocument<DocRaw>,
  DefaultQueryHelpers,
  AdminSchemaMethods
>;

export type AdminSchemaType<
  TProps = unknown,
  TDoc extends AdminDocument = AdminDocument,
> = MongooseSchema<TProps, AdminModel<TDoc>, AdminSchemaMethods>;

export class AdminSchema<
  TProps = unknown,
  TDoc extends AdminDocument = AdminDocument,
> extends mongoose.Schema<TProps, AdminModel<TDoc>, AdminSchemaMethods> {
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

    this.methods.bindValues = bindValues;
    this.methods.checkValidity = checkValidity;
    this.methods.trash = trash;
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
    this.pre("findOne", query);
    this.pre("findOneAndUpdate", query);
    this.pre("findOneAndDelete", query);
    this.pre("updateOne", query);
    this.pre("updateMany", query);
    this.pre("deleteOne", query);
    this.pre("deleteMany", query);

    audit(this);
  }
}

function getDTO(path) {
  return createDTO(this.get(path));
}

function toDTO(paths = null) {
  const result = {};
  for (const key of Object.keys(this.schema.paths)) {
    if (key === "__v" || !this.isSelected(key)) {
      continue;
    }
    if (paths && !paths.includes(key)) {
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
  for (const name of paths) {
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
  for (const name in fields) {
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
        })
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

async function checkValidity() {
  return await validity(this);
}

// Copy to Trash and then delete.
async function trash() {
  this.set("meta.deleted", true);
  await this.save();
}

export default AdminSchema;
