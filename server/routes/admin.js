'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const ctrl = require('../controllers/adminController');
const feedback = require('../controllers/feedbackController');

// every admin route requires a valid token AND the ADMIN role
router.use(verifyToken, checkRole('ADMIN'));

router.get('/users', ctrl.listUsers);
router.patch('/users/:id/active', ctrl.setUserActive);
router.patch('/users/:id/role', ctrl.setUserRole);
router.get('/stats', ctrl.stats);

// content moderation — soft-suspend / reactivate an item
router.patch('/items/:id/toggle-active', ctrl.toggleItemActive);

// feedback inbox (public submissions: questions + recommendations)
router.get('/feedback', feedback.listAll);
router.patch('/feedback/:id/toggle-approve', feedback.toggleApprove);

module.exports = router;
