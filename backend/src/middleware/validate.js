// Validates req.body / req.query / req.params against Zod schemas.
// Parsed (and type-coerced) values are stored on req.valid so controllers
// never touch unvalidated input.
const ApiError = require('../utils/ApiError');

function validate(schemas) {
  return (req, res, next) => {
    req.valid = req.valid || {};
    for (const part of ['body', 'query', 'params']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        throw ApiError.badRequest('Validation failed', details);
      }
      req.valid[part] = result.data;
    }
    next();
  };
}

module.exports = validate;
