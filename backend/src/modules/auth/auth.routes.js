const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { registerBody, loginBody } = require('./auth.schema');
const controller = require('./auth.controller');

router.post('/register', authenticate, requireRole('ADMIN'), validate({ body: registerBody }), controller.register);
router.post('/login', validate({ body: loginBody }), controller.login);
router.get('/me', authenticate, controller.me);

module.exports = router;
