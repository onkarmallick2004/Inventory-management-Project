const { z } = require('zod');
const { ROLES } = require('../../config/constants');

const registerBody = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(ROLES),
    phone: z.string().trim().optional(),
    customerId: z.number().int().positive().optional(),
  })
  // A customer login must belong to a customer company.
  .refine((u) => u.role !== 'CUSTOMER' || u.customerId, {
    message: 'customerId is required for CUSTOMER users',
    path: ['customerId'],
  });

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

module.exports = { registerBody, loginBody };
