'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('../utils/errors');

// the files themselves live on disk here — only their URL is stored in the DB
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new ApiError(400, 'רק קובצי תמונה נתמכים (jpg, png, webp, gif)'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
