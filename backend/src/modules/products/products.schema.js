const { z } = require('zod');
const { PRODUCT_CATEGORIES, PRODUCT_TYPES, PHASES } = require('../../config/constants');
const { listQuery } = require('../../utils/pagination');

const productBody = z.object({
  modelName: z.string().trim().min(2),
  name: z.string().trim().min(2),
  category: z.enum(PRODUCT_CATEGORIES),
  type: z.enum(PRODUCT_TYPES),
  airflowCfm: z.number().positive(),
  airflowLpm: z.number().positive(),
  pressureBar: z.number().positive(),
  powerKw: z.number().positive(),
  phase: z.enum(PHASES),
  applications: z.string().trim().min(1), // comma-separated tags
  price: z.number().nonnegative(),
  description: z.string().trim().optional(),
});

const productListQuery = listQuery.extend({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  phase: z.enum(PHASES).optional(),
});

module.exports = { productBody, productUpdateBody: productBody.partial(), productListQuery };
