'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/bookingsController');
const reviewsCtrl = require('../controllers/reviewsController');

router.use(verifyToken);

router.post('/', ctrl.create);
router.get('/mine', ctrl.mine);
router.get('/incoming', ctrl.incoming);
router.get('/:id', ctrl.getOne);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/reviews', reviewsCtrl.submit);

module.exports = router;
