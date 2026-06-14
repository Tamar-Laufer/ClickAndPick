'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ApiError } = require('../utils/errors');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const AUDIO_DIR = path.join(UPLOAD_DIR, 'audio');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function imageFilter(_req, file, cb) {
  if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new ApiError(400, 'רק קובצי תמונה נתמכים (jpg, png, webp, gif)'));
}

const image = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const AUDIO_EXT_BY_MIME = {
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
};

function audioExt(mimetype) {
  const base = String(mimetype).split(';')[0].trim().toLowerCase();
  return AUDIO_EXT_BY_MIME[base] || '.webm';
}

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${audioExt(file.mimetype)}`);
  },
});

function audioFilter(_req, file, cb) {
  const base = String(file.mimetype).split(';')[0].trim().toLowerCase();
  if (base.startsWith('audio/') && AUDIO_EXT_BY_MIME[base]) return cb(null, true);
  cb(new ApiError(400, 'רק קובצי אודיו נתמכים (webm, ogg, mp4, mp3, wav)'));
}

const audio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { image, audio, UPLOAD_DIR, AUDIO_DIR };
