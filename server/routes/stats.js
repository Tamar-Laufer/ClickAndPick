'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/statsController');

router.get('/', ctrl.publicStats);

module.exports = router;
