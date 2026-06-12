'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const ctrl = require('../controllers/adminController');
const feedback = require('../controllers/feedbackController');

// every admin route requires a valid token AND the ADMIN role
router.use(verifyToken, checkRole('ADMIN'));

router.get('/users', ctrl.listUsers); // supports ?page= &limit= &q=
router.patch('/users/:id/toggle-status', ctrl.toggleUserStatus);
router.patch('/users/:id/role', ctrl.setUserRole);
router.get('/stats', ctrl.stats);

// content moderation — list every item (incl. suspended) + soft-suspend / reactivate
router.get('/items', ctrl.listItems);
router.patch('/items/:id/toggle-active', ctrl.toggleItemActive);

// feedback inbox (public submissions: questions + recommendations)
router.get('/feedback', feedback.listAll);
router.patch('/feedback/:id/toggle-approve', feedback.toggleApprove);

module.exports = router;
