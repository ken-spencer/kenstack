type ReturnedErrorOptions = { code?: string; status?: number };

export interface ReturnedError extends Error {
  code?: string;
  status: number;
}

type ReturnedErrorConstructor = {
  (message: string, options?: ReturnedErrorOptions): ReturnedError;
  new (message: string, options?: ReturnedErrorOptions): ReturnedError;
  prototype: ReturnedError;
};

const createReturnedError = function (
  message: string,
  { code, status = 400 }: ReturnedErrorOptions = {},
) {
  const error = new Error(message);
  error.name = "ReturnedError";
  Object.setPrototypeOf(error, ReturnedError.prototype);

  return Object.assign(error, { code, status });
};

createReturnedError.prototype = Object.create(Error.prototype) as ReturnedError;
createReturnedError.prototype.constructor = createReturnedError;

export const ReturnedError = createReturnedError as ReturnedErrorConstructor;

export const unexpectedRequestMessage =
  "There was an unexpected problem handling your request. Please try again later.";

export function getReturnedErrorMessage(
  error: unknown,
  fallback = unexpectedRequestMessage,
) {
  return error instanceof ReturnedError ? error.message : fallback;
}
