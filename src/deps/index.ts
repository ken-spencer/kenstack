import { createDb } from "@kenstack/db";
import { Logger } from "@kenstack/logger";
import { createAuth } from "@kenstack/auth/server";
import Email from "./components/Email";
import type { EmailContainer } from "./components/Email";

import { type Users } from "@kenstack/modules/users/tables";
import { type Sessions } from "@kenstack/db/tables/sessions";
import { type Attachment } from "@kenstack/lib/mailer";

export type EmailFrom = string | { name: string; addr: string };

export type Tables = { users: Users; sessions: Sessions } & Record<
  string,
  unknown
>;

export const defaultRoles = ["admin", "member"] as const;

const formatFileSize = (bytes: number) => {
  const units = ["bytes", "kilobytes", "megabytes", "gigabytes"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex++;
  }

  return `${Number.isInteger(size) ? size : size.toFixed(1)} ${units[unitIndex]}`;
};

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
  siteUrl?: string;
  email?: {
    EmailCont?: EmailContainer;
    attachments?: Attachment[];
    from?: EmailFrom;
  };
  uploadMaxImageSize?: number;
  uploadMaxImageSizeMessage?: string;
}) => {
  const { email, ...depsOptions } = options;
  const db = createDb({ schema: options.tables });
  const logger = new Logger<TSchema>({ db });
  const roles = (options.roles ?? defaultRoles) as TRoles;
  const uploadMaxImageSize = options.uploadMaxImageSize ?? 5 * 1024 ** 2;
  const auth = createAuth<TSchema, TRoles>({
    db,
    tables: options.tables,
    logger,
    roles,
  });

  logger.bindAuth(auth);

  return {
    multiTenant: false,
    uploadMaxImageSize,
    uploadMaxImageSizeMessage: `Maximum image size is ${formatFileSize(uploadMaxImageSize)}.`,
    logger,
    auth,
    roles,
    db,
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
> = ReturnType<typeof createDeps<TSchema, TRoles>>;
