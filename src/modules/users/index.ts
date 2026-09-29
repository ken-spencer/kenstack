import { fields } from "./adminFields";
import { defineUsersModule } from "./module";
import { users } from "./tables";

export default defineUsersModule({ admin: { fields, table: users } });
