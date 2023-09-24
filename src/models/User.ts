import mongoose from "db";
import validator from "validator";
// import jwt from 'jsonwebtoken'
// import { signature } from "auth"
import bcrypt from "bcrypt";

const { Schema } = mongoose;

const SALT_WORK_FACTOR = 10;

const UserSchema = new Schema(
  {
    first_name: String,
    last_name: String,
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      set: (v) => v.toLowerCase(),
      validate: (value) => {
        return validator.isEmail(value);
      },
    },
    password: String,
  },
  { timestamps: true },
);

UserSchema.pre("save", function (next) {
  let user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) {
    return next();
  }

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) {
      return next(err);
    }

    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) {
        return next(err);
      }

      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) {
      return cb(err);
    }

    return cb(null, isMatch);
  });
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

//const User = mongoose.models.User || mongoose.model("User", UserSchema);
const User = mongoose.addModel("User", UserSchema);

export default User;
