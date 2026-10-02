// An error with an HTTP status and a machine-readable code.
// Throw it anywhere; middleware/errorHandler.js turns it into the standard JSON shape:
//   { "error": { "code": "NOT_FOUND", "message": "...", "details": ... } }
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(what = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${what} not found`);
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
}

module.exports = ApiError;
