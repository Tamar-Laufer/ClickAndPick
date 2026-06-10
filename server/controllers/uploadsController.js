'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/errors');

/**
 * Receives one image (multipart field "image"), which multer has already
 * saved to /uploads, and returns its public absolute URL. The caller then
 * stores that URL in the item's `imageUrl` field — the file stays on disk,
 * only the URL goes into the database.
 */
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'לא נשלח קובץ תמונה');
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});
