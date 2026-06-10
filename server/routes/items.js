'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/itemsController');
const reviewsCtrl = require('../controllers/reviewsController');

// public catalog
router.get('/', ctrl.list);

// address → { lat, lng } for the search bar (must precede '/:id')
router.get('/geocode', ctrl.geocode);

// the authenticated owner's own listings (must precede '/:id')
router.get('/mine', verifyToken, ctrl.mine);

router.get('/:id', ctrl.getOne);
router.get('/:id/reviews', reviewsCtrl.itemReviews); // public reviews for an item
router.get('/:id/booked-dates', ctrl.bookedDates); // confirmed date ranges to disable on the calendar

// owner-managed
router.post('/', verifyToken, ctrl.create);
// PATCH (partial edit) is the canonical update verb; PUT kept as a backwards-compatible alias.
// Both run the same controller, which re-verifies ownership (403) inside the service.
router.patch('/:id', verifyToken, ctrl.update);
router.put('/:id', verifyToken, ctrl.update);
router.delete('/:id', verifyToken, ctrl.remove);

module.exports = router;
