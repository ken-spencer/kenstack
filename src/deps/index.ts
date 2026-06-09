import { createDb } from "@kenstack/db";
import { Logger } from "@kenstack/logger";
import { createAuth } from "@kenstack/auth/server";
import type { AuthUsersTable } from "@kenstack/auth/server/types";
import Email from "./components/Email";
import type { EmailContainer } from "./components/Email";

import { type Sessions } from "@kenstack/db/tables/sessions";
import { type Attachment } from "@kenstack/lib/mailer";
import { formatFileSize } from "@kenstack/lib/fileSize";
import type { DefinedAdmin } from "@kenstack/admin/module";

export type EmailFrom = string | { name: string; addr: string };

export type Tables = { sessions: Sessions } & Record<string, unknown>;

type ModulesWithUsers = DefinedAdmin & {
  users: DefinedAdmin[string] & {
    admin: NonNullable<DefinedAdmin[string]["admin"]> & {
      table: AuthUsersTable;
    };
  };
};

export const defaultRoles = ["admin", "member"] as const;

export const createDeps = <
  TSchema extends Tables,
  const TRoles extends readonly string[] = typeof defaultRoles,
  const TModules extends ModulesWithUsers = ModulesWithUsers,
>(options: {
  roles?: TRoles;
  multiTenant?: boolean;
  modules: TModules;
  tables: TSchema;
  siteUrl?: string;
  email?: {
    EmailCont?: EmailContainer;
    attachments?: Attachment[];
    from?: EmailFrom;
  };
  uploadMaxImageSize?: number;
  uploadMaxImageSizeMessage?: string;
}) => {
  const { email, modules, ...depsOptions } = options;
  const db = createDb({ schema: options.tables });
  const logger = new Logger<TSchema>({ db });
  const roles = (options.roles ?? defaultRoles) as TRoles;
  const uploadMaxImageSize = options.uploadMaxImageSize ?? 5 * 1024 ** 2;
  const auth = createAuth<TSchema, TRoles>({
    db,
    tables: {
      users: modules.users.admin.table,
      sessions: options.tables.sessions,
    },
    logger,
    roles,
  });

  logger.bindAuth(auth);

  return {
    multiTenant: false,
    uploadMaxImageSize,
    uploadMaxImageSizeMessage: `Maximum image size is ${formatFileSize(uploadMaxImageSize, { unitStyle: "long" })}.`,
    logger,
    auth,
    roles,
    db,
    modules,
    ...depsOptions,
    email: {
      EmailCont: Email,
      attachments: [] as Attachment[],
      from: undefined as EmailFrom | undefined,
      ...email,
    },
  };
};

export type Deps<
  TSchema extends Tables = Tables,
  TRoles extends readonly string[] = typeof defaultRoles,
  TModules extends ModulesWithUsers = ModulesWithUsers,
> = ReturnType<typeof createDeps<TSchema, TRoles, TModules>>;
