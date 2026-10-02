const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { userListQuery, updateUserBody } = require('./users.schema');
const controller = require('./users.controller');

// User management is admin-only. New users are created via POST /api/auth/register.
router.use(authenticate, requireRole('ADMIN'));

router.get('/', validate({ query: userListQuery }), controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', validate({ body: updateUserBody }), controller.update);

module.exports = router;
