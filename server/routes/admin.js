'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const ctrl = require('../controllers/adminController');
const feedback = require('../controllers/feedbackController');

router.use(verifyToken, checkRole('ADMIN'));

router.get('/users', ctrl.listUsers);
router.patch('/users/:id/toggle-status', ctrl.toggleUserStatus);
router.patch('/users/:id/role', ctrl.setUserRole);
router.get('/stats', ctrl.stats);

router.get('/items', ctrl.listItems);
router.patch('/items/:id/toggle-active', ctrl.toggleItemActive);

router.get('/feedback', feedback.listAll);
router.patch('/feedback/:id/toggle-approve', feedback.toggleApprove);

module.exports = router;
