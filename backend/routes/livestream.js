const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/liveStreamController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Public routes (no authentication required for viewing)
router.get('/active', ctrl.getActive);
router.get('/stats', ctrl.getStats);
router.get('/info/:id', ctrl.getStreamInfo);
router.get('/current-stats/:id', ctrl.getCurrentStreamStats);
router.get('/history', ctrl.getLiveStreamHistory);
router.get('/detail/:id', ctrl.getLiveStreamDetail);
router.get('/recordings', ctrl.getRecordings);
router.get('/stream/:id', ctrl.streamVideo);
router.get('/download/:id', ctrl.downloadVideo);

// Protected routes (authentication required)
router.post('/start', authenticateToken, requireAdmin, ctrl.startLive);
router.post('/stop', authenticateToken, requireAdmin, ctrl.stopLive);
router.post('/viewers', authenticateToken, ctrl.updateViewers);
router.post('/reset-stats', authenticateToken, requireAdmin, ctrl.resetStats);
router.post('/sync-stats', authenticateToken, requireAdmin, ctrl.syncStats);
router.post('/update-recording', authenticateToken, requireAdmin, ctrl.updateRecordingPath);
router.post('/upload-recording', authenticateToken, requireAdmin, upload.single('recording'), ctrl.uploadLiveStreamRecording);

module.exports = router;