# Email log and address suppression

## Status

Planned. Implement the shared capability in Kenstack so Civic and other sites can adopt it through
module registration, a webhook route, and site-specific AWS configuration. This document records the
agreed scope; implementation and exact schema definitions remain to be done.

## Outcome

Staff can search outgoing email, see whether it was accepted, delivered, or failed, and find why an
address is blocked. The shared sender prevents further automated sends to suppressed addresses.

The staff email log is a view of outgoing-message records. Delivery events update those records;
there is no separate email-events table or delivery timeline in the initial scope.

## Records

### Outgoing messages and queue

Use one durable record per recipient message. Pending records can serve as the mail queue; completed
records remain in the same table as the searchable email log.

Record the recipient, sender, subject, purpose, current status, SES message ID, relevant timestamps,
and failure details. Allow the host to associate a message with its receipt, booking, or other source
record without putting Civic-specific domain knowledge into Kenstack.

Distinguish pending work, an in-progress send, SES acceptance, delivery, delay, failure, and a send
skipped because the address is suppressed. Final field and status names should be settled when the
schema is proposed. Keep enough timestamps and outcome information that a late send or delivery
notification cannot erase a bounce or complaint.

The initial log stores operational metadata. Do not expose authentication codes, login links, or
other bearer tokens in staff views or diagnostic payloads. Full message-body previews are outside the
initial scope. Decide payload storage, attachment handling, and retention when implementing deferred
sending; a metadata record alone is not enough for a worker to send an email later.

### Suppressed addresses

Keep a separate address-level table and staff view for active sending restrictions. Store the address,
reason, date, and reference to the message that caused suppression when one exists. Support permanent
bounces, complaints, and deliberate staff blocks. Addresses need not belong to a user account.

Use the existing audit facility to record staff changes, including a reason for lifting a block.
Deleting old message logs must not remove an active suppression. Review how reinstatement updates both
the local restriction and SES suppression before offering that action to staff.

A newsletter unsubscribe is a subscription preference. It stops the relevant newsletter while still
allowing requested transactional messages. Permanent delivery failures and complaints are broader
sending restrictions; keep these concepts separate when newsletter subscriptions are added.

## Sending and SES feedback

- Create the outgoing-message record before contacting SES. Save the result and returned SES message
  ID. SES acceptance must remain distinguishable from delivery to the recipient's mail server.
- Check suppression immediately before each actual send, including queued messages and retries.
  Record a suppressed outcome so staff can explain why no email was sent.
- Have the SES webhook update the matching message and apply address suppression when appropriate.
  Verify SNS signatures and the configured topic before processing notifications or confirming a
  subscription. Acknowledge success only after the required database changes are durable.
- Handle repeated and out-of-order notifications without duplicate side effects or incorrect status
  reversals. Account for feedback arriving before the sender has saved the SES message ID; do not
  silently acknowledge and lose an unmatched notification.
- Suppress permanent bounces and complaints. Record transient failures without permanently blocking
  an address after one failure. A delivery delay must not trigger a duplicate send while SES retries.
- Preserve an uncertain send outcome for reconciliation if a process fails after SES may have accepted
  the message. Do not automatically resend merely because the local result is missing. Civic's
  receipt and private-screening senders already guard this case; preserve their protection on adoption.
- Keep operational mail failures out of any error-reporting path that would recursively send email.

## Staff interface

Use Kenstack's existing list controls and the interaction pattern from Agate Springs' issues list:
`src/modules/issues/components/list/FiltersClient.tsx` in `~/node/agatesprings.com`. That implementation
uses `KeywordSearch`, `FilterControl`, `SortControl`, and URL-backed query state from Kenstack.

The Email view should provide:

- Recipient, subject, purpose, sending time, and current outcome in each row.
- Search by address, subject, and SES message ID.
- Filters for status, date range, and purpose; campaign filtering when newsletters exist.
- Sorting by newest, latest activity, recipient, and subject, with pagination and shareable filter URLs.
- Message details showing relevant timestamps, diagnostic information, and a host-provided link to
  the related record.
- A filtered view of messages needing staff attention, including failed receipts and booking emails.

The Suppressed addresses view should support address search and filtering by reason and date. Show the
cause, any staff notes, and a link to the address's message history. Restrict both views and suppression
changes to authorized staff on the server.

## Kenstack and host ownership

Kenstack owns the message and suppression records, shared sending checks, SES notification handling,
and staff views. Integrate with the existing `src/lib/mailer.ts` and preserve its public contracts
unless an API change is explicitly authorized.

Each host registers the capability, exposes the webhook route, configures its sender and AWS resources,
and supplies links to its own records. Keep records and suppression scoped to the adopting site; reuse
of Kenstack does not imply a shared cross-site database or blacklist. Check whether sites share an SES
account and region, since AWS account-level suppression can affect multiple sites.

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
  out-of-order processing, suppression before send, and uncertain send outcomes through appropriate
  application tests. Follow Kenstack's verification policy for database integration checks.

AWS references:

- [SES SNS event destination setup](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination-sns.html)
- [SES event payloads and bounce types](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html)
- [SNS signature verification](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html)
- [SNS retries and dead-letter queues](https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html)
- [SES account-level suppression](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [SES mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html)

## Future e-news work

Use the message records as the basis for per-recipient queued sending. Add campaign composition,
audience selection, subscription preferences, scheduling, rate limits, and resumable processing with
the newsletter feature. Keep login codes and other time-sensitive transactional mail prompt while
campaigns are sending. Detailed attempt history or an email-events table requires a demonstrated need
beyond the current status-based log.

## Acceptance criteria

- A host can adopt the shared capability without copying Kenstack's mail or suppression logic.
- Staff can find a message, understand its current outcome, and reach its related host record.
- SES feedback updates message state reliably, including duplicate and out-of-order notifications.
- Suppressed addresses are checked for every actual send, and skipped sends remain visible in the log.
- Staff can inspect and deliberately manage suppression without deleting customer or business records.
- The first version uses outgoing messages and suppressed addresses, with no separate events table.
