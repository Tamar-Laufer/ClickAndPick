'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('../controllers/messagesController');

// כל נתיבי הצ'אט דורשים אימות
router.use(verifyToken);

router.post('/', ctrl.send);
router.get('/:chatWithUserId', ctrl.history);

module.exports = router;
