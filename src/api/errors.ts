type UserFacingErrorOptions = { status?: number };

export interface UserFacingError extends Error {
  status: number;
}

type UserFacingErrorConstructor = {
  (message: string, options?: UserFacingErrorOptions): UserFacingError;
  new (message: string, options?: UserFacingErrorOptions): UserFacingError;
  prototype: UserFacingError;
};

const createUserFacingError = function (
  message: string,
  { status = 400 }: UserFacingErrorOptions = {},
) {
  const error = new Error(message);
  error.name = "UserFacingError";
  Object.setPrototypeOf(error, UserFacingError.prototype);

  return Object.assign(error, { status });
};

createUserFacingError.prototype = Object.create(
  Error.prototype,
) as UserFacingError;
createUserFacingError.prototype.constructor = createUserFacingError;

export const UserFacingError =
  createUserFacingError as UserFacingErrorConstructor;

export const unexpectedRequestMessage =
  "There was an unexpected problem handling your request. Please try again later.";

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = unexpectedRequestMessage,
) {
  return error instanceof UserFacingError ? error.message : fallback;
}
