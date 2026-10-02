// The account the tab's page was rendered for. fetcher sends it with every request, so an
// access-checked API never acts for a page drawn for another account. Isomorphic: the browser keeps
// the account here; the server reads only the header and the refusal.
export const renderedAccountHeader = "x-rendered-account";
// The refusal for a request from a page rendered for another account, and for one that needs a proven
// email while a session exists.
export const accountChangedRefusal = {
  code: "account-changed",
  message:
    "Your sign-in changed in another tab. Nothing here was saved. Reload the page to continue.",
};

// A user id, "none" for a page rendered signed out, or unset until a server render states one.
let renderedAccount: number | "none" | undefined;

export function getRenderedAccount() {
  return renderedAccount;
}

export function setRenderedAccount(account: number | "none") {
  renderedAccount = account;
}
