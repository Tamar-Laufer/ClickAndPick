'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/uploadsController');

// POST /api/uploads/image — multipart/form-data, field name "image" (auth required)
router.post('/image', verifyToken, upload.single('image'), ctrl.uploadImage);

module.exports = router;
