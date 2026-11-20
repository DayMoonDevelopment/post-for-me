export {
  AppException,
  type AppExceptionOptions,
  ConflictException,
  exceptionForKind,
  ForbiddenException,
  InternalException,
  kindForStatus,
  NotFoundException,
  TooManyRequestsException,
  // Semantic subclasses — throw + `instanceof`-check these (Nest-idiom names).
  UnauthorizedException,
  UpstreamException,
  ValidationException,
} from "./exceptions";
export {
  logError,
  redirectBackWithAppException,
  toActionError,
  toErrorResponse,
} from "./handle";
export { fromStripe, fromSupabase, type NormalizeOptions } from "./normalize";
// The kind vocabulary is client-safe and re-exported for convenience.
export { ERROR_KINDS, type ErrorKind, isErrorKind } from "~/lib/errors";
