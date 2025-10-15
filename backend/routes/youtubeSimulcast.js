const express = require('express');
const router = express.Router();
const youtubeSimulcastController = require('../controllers/youtubeSimulcastController');

// Start simulcast to YouTube with stream key
router.post('/simulcast/start', youtubeSimulcastController.startSimulcast);

// Stop simulcast
router.post('/simulcast/stop', youtubeSimulcastController.stopSimulcast);

// Get simulcast status
router.get('/simulcast/status/:roomId', youtubeSimulcastController.getSimulcastStatus);

// Get all active simulcasts
router.get('/simulcast/all', youtubeSimulcastController.getAllSimulcasts);

// Get FFmpeg status for a room
router.get('/simulcast/ffmpeg-status/:roomId', youtubeSimulcastController.getFFmpegStatus);

// Test FFmpeg functionality
router.post('/test-ffmpeg', youtubeSimulcastController.testFFmpeg);

// Test RTMP connection with stream key (like OBS)
router.post('/test-rtmp-stream-key', youtubeSimulcastController.testRTMPWithStreamKey);

module.exports = router;