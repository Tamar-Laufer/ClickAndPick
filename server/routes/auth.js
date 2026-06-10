'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.get('/me', verifyToken, ctrl.me);
router.put('/profile', verifyToken, ctrl.updateProfile);
router.put('/password', verifyToken, ctrl.changePassword);

module.exports = router;
