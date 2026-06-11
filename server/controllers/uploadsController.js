'use strict';

const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/errors');
const { AUDIO_DIR } = require('../middleware/upload');

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

/**
 * Receives one voice note (multipart field "audio"), which multer has already
 * saved into the PRIVATE /uploads/audio directory with a random filename, and
 * returns the protected, relative API path. We deliberately return a relative
 * path (not an absolute URL embedding the host) and never the disk path — the
 * file is reachable only through the authenticated GET route below.
 */
exports.uploadAudio = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'לא נשלח קובץ אודיו');
  const url = `/api/uploads/audio/${req.file.filename}`;
  res.status(201).json({ url });
});

/**
 * Streams a private voice note to an authenticated caller (verifyToken ran
 * first). The filename is reduced to its basename and the resolved path is
 * asserted to stay inside AUDIO_DIR, so "../" traversal cannot escape the
 * private folder. Delivery is via res.sendFile() (handles Range/streaming).
 */
exports.streamAudio = asyncHandler(async (req, res) => {
  // strip any path components a caller might smuggle in (e.g. "..\\secret")
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve(AUDIO_DIR, filename);

  // defence in depth: ensure we never resolve outside the private audio dir
  if (!filePath.startsWith(path.resolve(AUDIO_DIR) + path.sep)) {
    throw new ApiError(400, 'שם קובץ לא תקין');
  }

  res.sendFile(filePath, (err) => {
    if (!err) return;
    if (res.headersSent) return; // stream already started — nothing we can do
    const status = err.code === 'ENOENT' ? 404 : 500;
    res.status(status).json({ message: status === 404 ? 'הקובץ לא נמצא' : 'שגיאה בשליחת הקובץ' });
  });
});
