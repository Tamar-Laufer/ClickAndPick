'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const ctrl = require('../controllers/categoriesController');

router.get('/', ctrl.list);

router.post('/', verifyToken, checkRole('ADMIN'), ctrl.create);

module.exports = router;
