const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const recordingController = require('../controllers/recordingController');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

// CORS middleware for video streaming
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Upload recording
router.post('/upload', upload.single('recording'), recordingController.uploadRecording);
// List recordings
router.get('/', recordingController.listRecordings);
// Back-compat plural alias and optional limit support
router.get('/all', recordingController.listRecordings);
// Download recording
router.get('/download/:filename', recordingController.downloadRecording);
// Stream recording (for video playback) - with CORS
router.get('/stream/:filename', corsMiddleware, recordingController.streamRecording);
// Delete recording
router.delete('/:id', recordingController.deleteRecording);

module.exports = router; 