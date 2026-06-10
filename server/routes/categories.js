'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const ctrl = require('../controllers/categoriesController');

// PUBLIC — every category, for item forms and search filters
router.get('/', ctrl.list);

// ADMIN — add a new category
router.post('/', verifyToken, checkRole('ADMIN'), ctrl.create);

module.exports = router;
