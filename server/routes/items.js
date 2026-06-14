'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/itemsController');
const reviewsCtrl = require('../controllers/reviewsController');

router.get('/', ctrl.list);

router.get('/geocode', ctrl.geocode);

router.get('/mine', verifyToken, ctrl.mine);

router.get('/:id', ctrl.getOne);
router.get('/:id/reviews', reviewsCtrl.itemReviews);
router.get('/:id/booked-dates', ctrl.bookedDates);

router.post('/', verifyToken, ctrl.create);
router.patch('/:id', verifyToken, ctrl.update);
router.put('/:id', verifyToken, ctrl.update);
router.delete('/:id', verifyToken, ctrl.remove);

module.exports = router;
