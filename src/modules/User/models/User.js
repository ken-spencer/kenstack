import mongoose from "@kenstack/db";

import UserSchema from "./UserSchema";

export default mongoose.addModel("User", UserSchema);
