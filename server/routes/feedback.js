'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/feedbackController');

router.get('/approved', ctrl.approved);

router.post('/', ctrl.submit);

module.exports = router;
