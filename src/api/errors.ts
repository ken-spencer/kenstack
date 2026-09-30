type ReturnedErrorOptions = {
  code?: string;
  // Structured facts about the refusal that the browser acts on, returned beside the message.
  details?: Record<string, unknown>;
  status?: number;
  redirect?: string;
};

export class ReturnedError extends Error {
  name = "ReturnedError";
  code?: string;
  details?: Record<string, unknown>;
  status: number;
  redirect?: string;

  constructor(
    message: string,
    { code, details, status = 400, redirect }: ReturnedErrorOptions = {},
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
    this.redirect = redirect;
  }
}

export const unexpectedRequestMessage =
  "There was an unexpected problem handling your request. Please try again later.";

export function getReturnedErrorMessage(
  error: unknown,
  fallback = unexpectedRequestMessage,
) {
  return error instanceof ReturnedError ? error.message : fallback;
}
