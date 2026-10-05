import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// One row per recipient email: the Email Log, and later the newsletter queue. Transactional mail
// starts at `sending`; only queued mail uses `pending`.
export const emailMessages = pgTable(
  "email_messages",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // Lowercase, as the mailer sends it.
    to: text("to").notNull(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    kind: varchar("kind", { length: 64 }).notNull(),
    status: varchar("status", {
      length: 16,
      enum: [
        "pending",
        "sending",
        "sent",
        "delayed",
        "delivered",
        "soft-bounced",
        "bounced",
        "complained",
        "failed",
        "skipped",
      ],
    }).notNull(),
    sesMessageId: text("ses_message_id").unique(),
    // The site record the email is about, the pair audit logs use; the site turns it into a link.
    table: varchar("table", { length: 64 }),
    rowId: integer("row_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("email_messages_to_created_at_idx").on(t.to, t.createdAt),
    index("email_messages_status_created_at_idx").on(t.status, t.createdAt),
    index("email_messages_kind_created_at_idx").on(t.kind, t.createdAt),
    index("email_messages_table_row_id_idx").on(t.table, t.rowId),
    index("email_messages_created_at_idx").on(t.createdAt),
    index("email_messages_updated_at_idx").on(t.updatedAt),
    // Trigram indexes serve the Email Log search, which matches anywhere in the address or subject.
    index("email_messages_to_trgm_idx").using("gin", t.to.op("gin_trgm_ops")),
    index("email_messages_subject_trgm_idx").using(
      "gin",
      t.subject.op("gin_trgm_ops"),
    ),
  ],
);
