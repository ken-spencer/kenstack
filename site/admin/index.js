
import admin from "@thaumazo/cms/admin";

import User from "@thaumazo/cms/admin/User";
import Blog from "./Blog";

admin.add("User", "/", User, {title: "Manage users"});
admin.add("Blog", "/blog", Blog);


export default admin;
