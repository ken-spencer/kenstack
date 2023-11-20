import mongoose from "../db";
import isEmail from "validator/es/lib/isEmail";
// import jwt from 'jsonwebtoken'
// import { signature } from "auth"
import bcrypt from "bcrypt";
import audit from "../db/audit";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      set: (v) => v.toLowerCase().trim(),
      validate: (value) => {
        return isEmail(value);
      },
    },
    roles: [String],
    password: String,
  },
  { timestamps: true },
);

// tried this for a full text search, but seemed fairly useless.
// UserSchema.index({ first_name: 'text', last_name: 'text', email: 'text' });

UserSchema.pre("save", async function () {
  // only hash the password if it has been modified (or is new)
  if (this.password && !this.isModified("password")) {
    return;
  }

  // generate a salt
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(this.password.trim(), salt);
  this.password = hash;
});

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

/*
UserSchema.methods.generateToken = function() {
  const date = new Date();

  const claims = {
    // iss: "https://" + req.headers.host + "/", // The URL of your service
    sub: this._id.toString(), // The UID of the user in your system
    // scope: ['AUTHENTICATED', 'EVERYONE'], // role access for user.
  }

  // const token = jwt.sign(claims, process.env.SECRET, { expiresIn: '1h' });

  return token;
}
*/

/*
UserSchema.methods.setToken = function(response) {
  const token = this.generateToken()
	response.cookies.set('auth', token, {
		httpOnly: true,
    expires: Date.now() + (60 * 60 * 1000) // 1 hour,
    // secure: true,
	})
}
*/

// audit logging mixin
audit("User", UserSchema);

export default mongoose.addModel("User", UserSchema);
