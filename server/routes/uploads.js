'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { image, audio } = require('../middleware/upload');
const ctrl = require('../controllers/uploadsController');

router.post('/image', verifyToken, image.single('image'), ctrl.uploadImage);


router.post('/audio', verifyToken, audio.single('audio'), ctrl.uploadAudio);

router.get('/audio/:filename', verifyToken, ctrl.streamAudio);

module.exports = router;
