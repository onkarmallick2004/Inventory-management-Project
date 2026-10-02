// Helpers shared by every list endpoint: ?page=1&limit=20&search=abc&sort=field:asc
const { z } = require('zod');
const { isPostgres } = require('../config/env');

// Zod schema for the common list query parameters. Modules extend it with their own filters.
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sort: z.string().optional(), // e.g. "createdAt:desc"
});

// Turns page/limit into Prisma's skip/take.
function pageArgs({ page, limit }) {
  return { skip: (page - 1) * limit, take: limit };
}

// Turns "field:dir" into a Prisma orderBy, but only for whitelisted fields.
function sortArgs(sort, allowedFields, fallback = { id: 'desc' }) {
  if (!sort) return fallback;
  const [field, dir = 'asc'] = sort.split(':');
  if (!allowedFields.includes(field)) return fallback;
  return { [field]: dir === 'desc' ? 'desc' : 'asc' };
}

// Case-insensitive "contains" filter. SQLite's LIKE is already case-insensitive;
// Postgres needs mode: 'insensitive'.
function contains(text) {
  return isPostgres ? { contains: text, mode: 'insensitive' } : { contains: text };
}

// Builds an OR filter that matches the search text against several string columns.
function searchFilter(search, fields) {
  if (!search) return {};
  return { OR: fields.map((field) => ({ [field]: contains(search) })) };
}

// Standard list response shape.
function paged(data, total, { page, limit }) {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { listQuery, pageArgs, sortArgs, contains, searchFilter, paged };
