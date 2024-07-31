
import models from "@admin/models";

// import User from "@admin/models/User";
// import Blog from "./Blog";

models.add("User", () => import("@admin/models/User"));
models.add("Blog", () => import("./Blog"));

export default models;
