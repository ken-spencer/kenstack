# Email log and blocked emails

## Status

Slice 1 built (2 October 2026); slices 2 and 3 remain. Implement the shared capability in Kenstack so
Civic and other sites can adopt it through table registration, a webhook route, and site-specific AWS
configuration. The schema and the decisions below were ruled with Ken on 2 October 2026.

Build in three slices, each visible on its own:

1. Every email logged: `emailMessages`, the mailer writing a row per send, and the read-only "Email
   Log" admin list.
2. SES feedback: the webhook updates message status and blocks bounced and complaining addresses.
3. Blocked emails: the "Blocked Emails" admin module, the AWS setup and the mailbox-simulator tests.

Staff-facing names are plain: "Email Log" and "Blocked Emails". "Suppression" is SES's word; it stays
out of code names and the admin.

## Schema (ruled 2 October 2026)

### `emailMessages` (`email_messages`): one row per recipient email

The log, and later the newsletter queue. A plain table, read-only in the admin.

| Column (TS / DB)                  | Type             | Null | Notes                                                                                                    |
| --------------------------------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `id`                              | integer identity | no   | primary key                                                                                              |
| `to`                              | text             | no   | recipient, lowercase; matches `mailer.ts`                                                                |
| `from`                            | text             | no   | as sent, e.g. `Civic Theatre <info@…>`; matches `mailer.ts`                                              |
| `subject`                         | text             | no   |                                                                                                          |
| `kind`                            | varchar(64)      | no   | set by the sending code, in camelCase: `verification`, `receipt`, `screeningRequest`, later `newsletter` |
| `status`                          | varchar enum     | no   | below                                                                                                    |
| `sesMessageId` / `ses_message_id` | text             | yes  | unique; empty until SES accepts                                                                          |
| `table`                           | varchar(64)      | yes  | the site record's table, e.g. `orders`; the same pair `audit_logs` uses                                  |
| `rowId` / `row_id`                | integer          | yes  | that record's id; the site turns `table` and `rowId` into an admin link, so no stored URL goes stale     |
| `error`                           | text             | yes  | bounce or failure reason only, e.g. "Permanent / NoEmail"                                                |
| `createdAt` / `created_at`        | timestamptz      | no   | default now; created or queued                                                                           |
| `sentAt` / `sent_at`              | timestamptz      | yes  | when SES accepted                                                                                        |
| `updatedAt` / `updated_at`        | timestamptz      | no   | last status change                                                                                       |

Indexes: `(to, created_at)` for an address's history, `(status, created_at)` for the attention filter,
`(table, row_id)` for a record's emails, `(created_at)` for sorting and pruning; `ses_message_id` is
unique.

Statuses: `pending` (queued, not tried) → `sending` → `sent` (SES accepted) → `delayed` (the
recipient's server is temporarily unavailable and SES is retrying) → `delivered`, or `soft-bounced`
(SES gave up on a temporary failure such as a full mailbox) or `bounced` (permanent); `complained` can
follow any of them. Also `failed` (rejected or send error) and `skipped` (blocked address, never sent).
A server that is down for a while shows `delayed`, then `delivered` once SES gets through. Transactional
mail starts at `sending`; only queued mail uses `pending`. SES notifications only move a status
forward: a late `delivered` never overwrites `bounced` or `complained`. `soft-bounced` never blocks an
address on its own; it keeps soft bounces countable, so a rule such as "three in 30 days blocks the
address" can be added later without a schema change. An uncertain send is derived, not stored: a row still `sending` with no `sentAt` after
a few minutes shows flagged to staff and is never resent automatically.

### `blockedEmails` (`blocked_emails`): addresses Kenstack won't send to

An admin table, so it has the standard `id`, `created_by`, `created_at`, `updated_at` and `deleted_at`,
and revisions, audit and trash come free.

| Column                     | Type         | Null | Notes                                                      |
| -------------------------- | ------------ | ---- | ---------------------------------------------------------- |
| `email`                    | text         | no   | lowercase; unique among rows not in the trash              |
| `reason`                   | varchar enum | no   | `bounce`, `complaint`, `staff`                             |
| `messageId` / `message_id` | integer      | yes  | references `email_messages.id`, set null when it is pruned |
| `note`                     | text         | yes  | staff note                                                 |

A partial unique index on `email` where `deleted_at is null` allows one active block per address; a
lifted (trashed) block doesn't prevent a new one. The send-time check is "is there a live row for this
address?".

Staff can add a block (reason `staff`) and edit the note. Lifting a block moves it to the trash, so it
can be restored; the lift's reason goes in the note, and the audit records who. The webhook creates
`bounce` and `complaint` rows; staff can lift them but not change their reason.

## Decisions (2 October 2026)

- Record every message as a lean metadata row; tracking only failures gives no send counts, no rates
  and no queue. No message bodies and no separate events table.
- `emailMessages` doubles as the newsletter queue: a send inserts one `pending` row per recipient
  (address and campaign), snapshotting the audience; a worker sends them at SES's rate. Transactional
  mail sends immediately and logs its row.
- Bodies are rendered at send time: a newsletter from its campaign (with per-recipient parts such as the
  unsubscribe link), transactional mail from its source record. A campaign's content locks once
  sending starts.
- Retention: message rows older than 13 months are pruned by the usual sampled cleanup (a small share
  of requests, through `waitUntil`; no cron). Blocked emails are never pruned.
- SNS signatures are verified with about 40 hand-written lines using Node's `crypto`; no new package.
- A notification that arrives before its message has an `sesMessageId` gets a non-2xx reply, so SNS
  redelivers it; the dead-letter queue catches any that never match. Nothing extra is stored.
- A newsletter's rows point at it through `table: "newsletters"` and `rowId`, so messages need no
  `campaignId` column (Ken, 2 October 2026).
- With the newsletter, not now: a newsletters table with sent, delivered, bounced and complained
  counters (so rates survive pruning), subscriptions, and how the queue worker runs on Vercel.

## Outcome

Staff can search outgoing email, see whether it was accepted, delivered, or failed, and find why an
address is blocked. The shared sender prevents further automated sends to blocked addresses.

The log stores operational metadata only. Do not expose authentication codes, login links, or other
bearer tokens in staff views or diagnostic payloads. Full message-body previews are outside the
initial scope.

Blocked emails need not belong to a user account. Deleting old message rows must not remove an active
block. Review how lifting a block interacts with SES's own account-level suppression list before
offering that action to staff.

A newsletter unsubscribe is a subscription preference. It stops the relevant newsletter while still
allowing requested transactional messages. Permanent delivery failures and complaints are broader
sending restrictions; keep these concepts separate when newsletter subscriptions are added.

## Sending and SES feedback

- Create the message row before contacting SES. Save the result and returned SES message ID. SES
  acceptance must remain distinguishable from delivery to the recipient's mail server.
- Check blocked emails immediately before each actual send, including queued messages and retries.
  Record a `skipped` outcome so staff can explain why no email was sent.
- Have the SES webhook update the matching message and block the address when appropriate. Verify SNS
  signatures and the configured topic before processing notifications or confirming a subscription.
  Acknowledge success only after the required database changes are durable.
- Handle repeated and out-of-order notifications without duplicate side effects or incorrect status
  reversals.
- Block permanent bounces and complaints. Record transient failures without permanently blocking an
  address after one failure. A delivery delay must not trigger a duplicate send while SES retries.
- Do not automatically resend merely because the local result is missing. Civic's receipt and
  private-screening senders already guard this case; preserve their protection on adoption.
- Keep operational mail failures out of any error-reporting path that would recursively send email.

## Staff interface

Use Kenstack's existing list controls and the interaction pattern from Agate Springs' issues list:
`src/modules/issues/components/list/FiltersClient.tsx` in `~/node/agatesprings.com`. That implementation
uses `KeywordSearch`, `FilterControl`, `SortControl`, and URL-backed query state from Kenstack.

The Email Log should provide:

- Recipient, subject, kind, sending time, and current outcome in each row.
- Search by address, subject, and SES message ID.
- Filters for status, date range, and kind; campaign filtering when newsletters exist.
- Sorting by newest, latest activity, recipient, and subject, with pagination and shareable filter URLs.
- Message details showing relevant timestamps, the error, and the site's link to the related record.
- A filtered view of messages needing staff attention, including failed receipts and booking emails.

Blocked Emails should support address search and filtering by reason and date. Show the cause, any
staff notes, and a link to the address's messages in the Email Log. Restrict both views and block
changes to authorized staff on the server.

The Email Log sits in the admin's "Logs" group (Kenstack todo README, item 6), with Blocked Emails next
to it so staff find an address's history and its block in one place.

For each failed message, staff see the reason in plain words ("Address doesn't exist", "Mailbox full",
"Marked as spam"), the recipient and the link to its record. Follow-up is usually phoning the customer
or correcting their email; sign-in codes are left out of "needs attention", since the person retries
those themselves. No "Resend" action in this scope: resending receipts safely needs its own design.

Deferred: a "Needs attention" card on the admin dashboard, shown only when the count is above zero,
linking to the filtered Email Log.

## Kenstack and host ownership

Kenstack owns both tables, the shared sending checks, SES notification handling, and the staff views.
Integrate with the existing `src/lib/mailer.ts` and preserve its public contracts unless an API change
is explicitly authorized.

Each host registers the capability, exposes the webhook route, configures its sender and AWS resources,
and turns `table` and `rowId` into links to its own records. Keep records and blocks scoped to the
adopting site; reuse of Kenstack does not imply a shared cross-site database or blocklist. Check whether
sites share an SES account and region, since AWS account-level suppression can affect multiple sites.

Each host supplies two configuration values: its SNS topic ARN (checked on every notification) and its
SES configuration set name (used on every send).

### Civic's adoption

- `kind` and record links: receipts link to their order, private-screening request emails to their
  request; sign-in codes and other auth mail have no record link.
- The Email Log's "needs attention" filter shows `failed`, `bounced`, and rows stuck in `sending`, for
  receipts and booking emails first.

## Testing before launch (ruled 2 October 2026)

Civic has no public endpoint for SNS until launch, so:

1. Slice 1 (the Email Log) is tested in Civic's dev environment, which already sends real email
   through SES.
2. Unit tests cover the webhook against AWS's documented sample notifications (delivery, soft and hard
   bounce, complaint, delay, duplicate and out-of-order arrivals), and the signature check with a test
   certificate.
3. End-to-end SES feedback (slices 2 and 3) is tested on Agate Springs (`~/node/agatesprings.com`), which
   has live SES and a verified sending domain. Agate Springs adopts the feature first: it registers the
   two modules, adds the webhook route and its two configuration values. Use the SES mailbox simulator
   addresses (`success@`, `bounce@`, `complaint@`, `suppressionlist@simulator.amazonses.com`) so the
   tests don't affect sending reputation. Civic then adopts the same code at launch and repeats a
   short simulator check against production.

## AWS setup and verification

- Use the host's SES region and verified sending identity; confirm production access.
- Create a configuration set and SNS Standard topic with SES publishing permission scoped to the
  intended account and configuration set. Ensure outgoing messages use that set, through identity
  defaults or explicit send configuration.
- Subscribe and confirm the host's HTTPS endpoint. Initially collect sends, deliveries, bounces,
  complaints, delays, and rejects. Leave open/click tracking off.
- Enable SES suppression for bounces and complaints. Attach an SQS dead-letter queue to the SNS
  subscription, with an alert and recovery procedure for notifications that exhaust delivery retries.
- Test delivery, bounce, and complaint handling using the SES mailbox simulator. Verify duplicate and
  out-of-order processing, the block check before send, and uncertain send outcomes through
  appropriate application tests. Follow Kenstack's verification policy for database integration checks.

AWS references:

- [SES SNS event destination setup](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination-sns.html)
- [SES event payloads and bounce types](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html)
- [SNS signature verification](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html)
- [SNS retries and dead-letter queues](https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html)
- [SES account-level suppression](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [SES mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html)

## Future e-news work

Use `emailMessages` as the basis for per-recipient queued sending. Add campaign composition, audience
selection, subscription preferences, scheduling, rate limits, and resumable processing with the
newsletter feature. Keep login codes and other time-sensitive transactional mail prompt while campaigns
are sending. Detailed attempt history or an email-events table requires a demonstrated need beyond the
current status-based log.

## Acceptance criteria

- A host can adopt the shared capability without copying Kenstack's mail or blocking logic.
- Staff can find a message, understand its current outcome, and reach its related host record.
- SES feedback updates message state reliably, including duplicate and out-of-order notifications.
- Blocked emails are checked for every actual send, and skipped sends remain visible in the log.
- Staff can inspect and deliberately manage blocks without deleting customer or business records.
- The first version uses `emailMessages` and `blockedEmails`, with no separate events table.
