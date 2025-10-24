const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/liveStreamController');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Public routes (no authentication required for viewing)
router.get('/active', ctrl.getActive);
router.get('/stats', ctrl.getStats);
router.get('/history', ctrl.getLiveStreamHistory);
router.get('/recordings', ctrl.getRecordings);

// All routes are now public (no authentication required)
router.post('/start', ctrl.startLive);
router.post('/stop', ctrl.stopLive);
router.post('/viewers', ctrl.updateViewers);
router.post('/reset-stats', ctrl.resetStats);
router.post('/sync-stats', ctrl.syncStats);
router.post('/update-recording', ctrl.updateRecordingPath);
router.post('/upload-recording', upload.single('recording'), ctrl.uploadLiveStreamRecording);
router.post('/stream-ended', ctrl.notifyStreamEnded);

// Routes with :id parameter (order matters - more specific routes first)
router.delete('/:id', ctrl.deleteLiveStream);
router.get('/info/:id', ctrl.getStreamInfo);
router.get('/current-stats/:id', ctrl.getCurrentStreamStats);
router.get('/detail/:id', ctrl.getLiveStreamDetail);
router.get('/stream/:id', ctrl.streamVideo);
router.get('/download/:id', ctrl.downloadVideo);

module.exports = router;