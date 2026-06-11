'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { image, audio } = require('../middleware/upload');
const ctrl = require('../controllers/uploadsController');

// POST /api/uploads/image — multipart/form-data, field name "image" (auth required)
router.post('/image', verifyToken, image.single('image'), ctrl.uploadImage);

// ── Private voice messages ───────────────────────────────────────────────────
// These never go through express.static; both ends require a valid token so the
// audio of a private conversation is not world-readable by guessing a filename.

// POST /api/uploads/audio — multipart/form-data, field name "audio"
router.post('/audio', verifyToken, audio.single('audio'), ctrl.uploadAudio);

// GET /api/uploads/audio/:filename — authenticated streaming via res.sendFile()
router.get('/audio/:filename', verifyToken, ctrl.streamAudio);

module.exports = router;
