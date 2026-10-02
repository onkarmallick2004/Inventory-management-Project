// Converts every error into the same JSON shape:
//   { "error": { "code": "SOME_CODE", "message": "Human readable", "details": optional } }
const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');

function notFoundRoute(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

// Translates the Prisma errors we expect into friendly API errors.
function fromPrisma(err) {
  if (err.code === 'P2002') {
    const fields = err.meta?.target;
    return ApiError.conflict(`A record with this ${[].concat(fields || 'value').join(', ')} already exists`);
  }
  if (err.code === 'P2025') return ApiError.notFound('Record');
  if (err.code === 'P2003') {
    return ApiError.conflict('This record is linked to other records and cannot be changed or deleted');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let apiError = err instanceof ApiError ? err : null;

  if (!apiError && err instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = fromPrisma(err);
  }
  if (!apiError && err.type === 'entity.parse.failed') {
    apiError = ApiError.badRequest('Request body is not valid JSON');
  }

  if (!apiError) {
    console.error(err);
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  const body = { code: apiError.code, message: apiError.message };
  if (apiError.details) body.details = apiError.details;
  res.status(apiError.status).json({ error: body });
}

module.exports = { errorHandler, notFoundRoute };
