'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/feedbackController');

// PUBLIC — approved recommendations for the homepage carousel
// (declared before any '/:id' would be, though there is none here)
router.get('/approved', ctrl.approved);

// PUBLIC — anyone submits a question or a recommendation
router.post('/', ctrl.submit);

module.exports = router;
