import { fields } from "./adminFields";
import client from "./client";
import { defineUsersModule } from "./module";
import { users } from "./tables";

export default defineUsersModule({
  client,
  admin: { fields, table: users },
});
