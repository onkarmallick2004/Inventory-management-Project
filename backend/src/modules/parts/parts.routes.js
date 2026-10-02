const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { createPartBody, updatePartBody, restockBody, partListQuery } = require('./parts.schema');
const controller = require('./parts.controller');

router.use(authenticate);

// Technicians need to look up parts to record what they used on a job.
router.get('/', requireRole('ADMIN', 'TECHNICIAN'), validate({ query: partListQuery }), controller.list);
router.get('/:id', requireRole('ADMIN', 'TECHNICIAN'), controller.getOne);
router.post('/', requireRole('ADMIN'), validate({ body: createPartBody }), controller.create);
router.put('/:id', requireRole('ADMIN'), validate({ body: updatePartBody }), controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.remove);
router.post('/:id/restock', requireRole('ADMIN'), validate({ body: restockBody }), controller.restock);

module.exports = router;
