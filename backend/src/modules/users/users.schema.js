const { z } = require('zod');
const { ROLES } = require('../../config/constants');
const { listQuery } = require('../../utils/pagination');

const userListQuery = listQuery.extend({
  role: z.enum(ROLES).optional(),
});

const updateUserBody = z
  .object({
    name: z.string().trim().min(2),
    phone: z.string().trim().nullable(),
    isActive: z.boolean(),
    password: z.string().min(8),
  })
  .partial();

module.exports = { userListQuery, updateUserBody };
