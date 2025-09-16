const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/liveStreamController');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

router.post('/start', ctrl.startLive);
router.post('/stop', ctrl.stopLive);
router.get('/active', ctrl.getActive);
router.get('/stats', ctrl.getStats);
router.post('/viewers', ctrl.updateViewers);
router.get('/info/:id', ctrl.getStreamInfo);
router.post('/reset-stats', ctrl.resetStats);
router.post('/sync-stats', ctrl.syncStats);
// Tambahkan route baru untuk mendapatkan statistik stream saat ini
router.get('/current-stats/:id', ctrl.getCurrentStreamStats);
// Routes untuk history dan recording
router.get('/history', ctrl.getLiveStreamHistory);
router.get('/detail/:id', ctrl.getLiveStreamDetail);
router.post('/update-recording', ctrl.updateRecordingPath);
router.get('/recordings', ctrl.getRecordings);
// Routes untuk streaming dan download video
router.get('/stream/:id', ctrl.streamVideo);
router.get('/download/:id', ctrl.downloadVideo);
// Route untuk upload recording dari live stream
router.post('/upload-recording', upload.single('recording'), ctrl.uploadLiveStreamRecording);

module.exports = router;