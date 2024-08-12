import mongoose from "@admin/db";

import isEmail from "validator/es/lib/isEmail";
import bcrypt from "bcrypt";

import AdminSchema from "@admin/db/AdminSchema";

const UserSchema = new AdminSchema({
  first_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    // unique: true,
    lowercase: true,
    set: (v) => v.toLowerCase().trim(),
    validate: (value) => {
      return isEmail(value);
    },
  },
  roles: [String],
  password: String,
});
// tried this for a full text search, but seemed fairly useless.
// UserSchema.index({ first_name: 'text', last_name: 'text', email: 'text' });

UserSchema.pre("save", async function (next) {
  // only hash the password if it has been modified (or is new)
  if (this.password && !this.isModified("password")) {
    next();
    return;
  }

  // generate a salt
  const salt = await bcrypt.genSalt(10);
  if (this.password) {
    const hash = await bcrypt.hash(this.password.trim(), salt);
    this.password = hash;
  }
  next();
});

UserSchema.methods.hasRole = async function (...roles) {
  for (const role of roles) {
    if (this.roles.includes(role)) {
      return true;
    }
  }
  return false;
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.getFullName = function () {
  const list = [];
  if (this.first_name) {
    list.push(this.first_name);
  }

  if (this.last_name) {
    list.push(this.last_name);
  }

  const name = list.join(" ");
  return name;
};

// export default UserSchema;

UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { "meta.deleted": false } });

export default mongoose.addModel("User", UserSchema);
