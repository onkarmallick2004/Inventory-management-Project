// Parses the :id route parameter, rejecting anything that is not a positive integer.
const ApiError = require('./ApiError');

function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest(`Invalid ${name}`);
  }
  return id;
}

module.exports = { parseId };
