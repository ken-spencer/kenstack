
import models from "@thaumazo/cms/models";

// import User from "@thaumazo/cms/models/User";
// import Blog from "./Blog";

models.add("User", () => import("@thaumazo/cms/models/User"));
models.add("Blog", () => import("./Blog"));

export default models;
