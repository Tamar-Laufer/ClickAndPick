'use strict';

const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/errors');
const { AUDIO_DIR } = require('../middleware/upload');

exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'לא נשלח קובץ תמונה');
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

exports.uploadAudio = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'לא נשלח קובץ אודיו');
  const url = `/api/uploads/audio/${req.file.filename}`;
  res.status(201).json({ url });
});

exports.streamAudio = asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve(AUDIO_DIR, filename);

  if (!filePath.startsWith(path.resolve(AUDIO_DIR) + path.sep)) {
    throw new ApiError(400, 'שם קובץ לא תקין');
  }

  res.sendFile(filePath, (err) => {
    if (!err) return;
    if (res.headersSent) return;
    const status = err.code === 'ENOENT' ? 404 : 500;
    res.status(status).json({ message: status === 404 ? 'הקובץ לא נמצא' : 'שגיאה בשליחת הקובץ' });
  });
});
