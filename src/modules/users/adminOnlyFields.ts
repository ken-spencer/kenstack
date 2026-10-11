// Only admins change an existing contact's sign-in email, whichever roles a site lets edit users: anyone
// else who could set it to their own address could sign in as that contact, an admin included. A new
// contact's email is anyone's to enter. The editor shows the field read-only and the admin save drops
// it for anyone else.
export const adminOnlyUserFields = ["email"];
