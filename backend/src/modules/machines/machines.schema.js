const { z } = require('zod');
const { listQuery } = require('../../utils/pagination');

const machineFields = {
  serialNumber: z.string().trim().min(3),
  productId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  location: z.string().trim().optional(),
  installDate: z.coerce.date(),
  warrantyEnd: z.coerce.date().nullable().optional(),
  amcStart: z.coerce.date().nullable().optional(),
  amcEnd: z.coerce.date().nullable().optional(),
  serviceIntervalDays: z.number().int().min(1).max(730),
  nextServiceDue: z.coerce.date().nullable().optional(),
};

// AMC end must come after AMC start.
const amcOrder = (m) => !m.amcStart || !m.amcEnd || m.amcEnd > m.amcStart;
const amcMessage = { message: 'amcEnd must be after amcStart', path: ['amcEnd'] };

// The 90-day default applies only when creating, so an update never resets it.
const machineBody = z
  .object({ ...machineFields, serviceIntervalDays: machineFields.serviceIntervalDays.default(90) })
  .refine(amcOrder, amcMessage);
const machineUpdateBody = z.object(machineFields).partial().refine(amcOrder, amcMessage);

const machineListQuery = listQuery.extend({
  customerId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  category: z.enum(['AIR_COMPRESSOR', 'VACUUM_PUMP']).optional(),
});

module.exports = { machineBody, machineUpdateBody, machineListQuery };
