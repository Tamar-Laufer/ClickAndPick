'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/dashboardController');

// EVERY dashboard route is protected — no token, no access.
// verifyToken decodes the JWT and puts the trusted user on req.user.
router.use(verifyToken);

router.get('/my-rentals', ctrl.myRentals);
router.get('/incoming-requests', ctrl.incomingRequests);

module.exports = router;
