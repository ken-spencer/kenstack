
import admin from "@admin/admin";

import User from "@admin/admin/User";
import Blog from "./Blog";

admin.add("User", "/", User, {title: "Manage users"});
admin.add("Blog", "/blog", Blog);


export default admin;
