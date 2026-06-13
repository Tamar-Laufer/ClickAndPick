'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/statsController');

// PUBLIC — aggregate community counts shown on the homepage. No auth.
router.get('/', ctrl.publicStats);

module.exports = router;
