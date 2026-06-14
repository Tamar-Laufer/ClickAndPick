'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/dashboardController');

router.use(verifyToken);

router.get('/my-rentals', ctrl.myRentals);
router.get('/incoming-requests', ctrl.incomingRequests);

module.exports = router;
