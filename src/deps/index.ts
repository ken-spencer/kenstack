import { createDb } from "@kenstack/db";
import { createLogger } from "@kenstack/logger";
import { createAuth } from "@kenstack/auth/server";
import Email from "./components/Email";

import { type Users } from "@kenstack/modules/users/tables";
import { type Sessions } from "@kenstack/db/tables/sessions";
import { type Attachment } from "@kenstack/lib/mailer";

export type Tables = { users: Users; sessions: Sessions } & Record<
  string,
  unknown
>;

export type AccountMenuItems = [
  href: string,
  title: string,
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
][];

export const defaultRoles = ["admin", "member"] as const;

// type BaseDeps<TRoles extends readonly string[]> = {
//   roles?: TRoles;
//   multiTenant?: boolean;
//   tables: Record<string, unknown>;
// };

export const createDeps = <
  TSchema extends Tables,
  const TRoles extends readonly string[] = typeof defaultRoles,
>(options: {
  roles?: TRoles;
  multiTenant?: boolean;
  tables: TSchema;
  accountMenu?: { getItems: () => AccountMenuItems };
}) => {
  const db = createDb({ schema: options.tables });
  const logger = createLogger<TSchema>(db);
  const roles = (options.roles ?? defaultRoles) as TRoles;
  const auth = createAuth<TSchema, TRoles>({
    db,
    tables: options.tables,
    logger,
    roles,
  });
  return {
    multiTenant: false,
    ...options,
    logger,
    auth,
    roles,
    db,
    email: {
      EmailCont: Email,
      attachments: [] as Attachment[],
    },
  };
};

export type Deps<
  TSchema extends Tables = Tables,
  TRoles extends readonly string[] = typeof defaultRoles,
> = ReturnType<typeof createDeps<TSchema, TRoles>>;
