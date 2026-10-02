const { z } = require('zod');
const { listQuery } = require('../../utils/pagination');

const partFields = {
  partNumber: z.string().trim().min(2),
  name: z.string().trim().min(2),
  minimumLevel: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
  compatibleProductIds: z.array(z.number().int().positive()).optional(),
};

// stockQty can be set when a part is created. After that it only changes through
// restock entries or closing a job, so every change is recorded in StockMovement.
const createPartBody = z.object({ ...partFields, stockQty: z.number().int().nonnegative().default(0) });
const updatePartBody = z.object(partFields).partial();

const restockBody = z.object({
  quantity: z.number().int().positive(),
  note: z.string().trim().optional(),
});

const partListQuery = listQuery.extend({
  lowStock: z.enum(['true', 'false']).optional(), // ?lowStock=true shows only parts at or below minimum
  productId: z.coerce.number().int().positive().optional(), // parts compatible with a product
});

module.exports = { createPartBody, updatePartBody, restockBody, partListQuery };
