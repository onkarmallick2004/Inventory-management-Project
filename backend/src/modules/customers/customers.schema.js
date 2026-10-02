const { z } = require('zod');

const customerBody = z.object({
  companyName: z.string().trim().min(2),
  contactPerson: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(6),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
});

module.exports = { customerBody, customerUpdateBody: customerBody.partial() };
