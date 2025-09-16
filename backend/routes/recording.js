const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const recordingController = require('../controllers/recordingController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

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

// Public routes (no authentication required for viewing)
router.get('/', recordingController.listRecordings);
router.get('/all', recordingController.listRecordings);
router.get('/download/:filename', recordingController.downloadRecording);
router.get('/stream/:filename', corsMiddleware, recordingController.streamRecording);

// Protected routes (authentication required)
router.post('/upload', authenticateToken, requireAdmin, upload.single('recording'), recordingController.uploadRecording);
router.delete('/:id', authenticateToken, requireAdmin, recordingController.deleteRecording);

module.exports = router; 