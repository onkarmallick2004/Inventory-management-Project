const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { productBody, productUpdateBody, productListQuery } = require('./products.schema');
const controller = require('./products.controller');

// The product catalog is public so the marketing site can show it.
router.get('/', validate({ query: productListQuery }), controller.list);
router.get('/:id', controller.getOne);

router.post('/', authenticate, requireRole('ADMIN'), validate({ body: productBody }), controller.create);
router.put('/:id', authenticate, requireRole('ADMIN'), validate({ body: productUpdateBody }), controller.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), controller.remove);

module.exports = router;
