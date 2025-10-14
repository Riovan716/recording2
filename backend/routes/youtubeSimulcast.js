const express = require('express');
const router = express.Router();
const youtubeSimulcastController = require('../controllers/youtubeSimulcastController');

// Get YouTube integration status
router.get('/status', youtubeSimulcastController.getStatus);

// Get YouTube authorization URL
router.get('/auth/url', youtubeSimulcastController.getAuthUrl);

// Handle YouTube OAuth callback
router.get('/auth/callback', youtubeSimulcastController.handleCallback);

// Store tokens from localStorage (POST)
router.post('/auth/callback', youtubeSimulcastController.storeTokens);

// Test callback endpoint
router.get('/auth/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Callback</title>
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: #f0f0f0;
          margin: 0;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .success {
          color: #4CAF50;
          font-size: 24px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success">✅ Test Callback Working!</div>
        <p>This is a test callback page to verify Electron can display HTML content.</p>
        <p>If you can see this, the callback mechanism is working.</p>
        <script>
          console.log('Test callback page loaded successfully');
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </div>
    </body>
    </html>
  `);
});

// Start simulcast to YouTube
router.post('/simulcast/start', youtubeSimulcastController.startSimulcast);

// Stop simulcast
router.post('/simulcast/stop', youtubeSimulcastController.stopSimulcast);

// Get simulcast status for specific room
router.get('/simulcast/status/:roomId', youtubeSimulcastController.getSimulcastStatus);

// Get all active simulcasts
router.get('/simulcast/all', youtubeSimulcastController.getAllSimulcasts);

// Get FFmpeg process status
router.get('/simulcast/ffmpeg-status/:roomId', youtubeSimulcastController.getFFmpegStatus);

// Test FFmpeg functionality
router.post('/test-ffmpeg', youtubeSimulcastController.testFFmpeg);

// Test RTMP connection
router.post('/test-rtmp', youtubeSimulcastController.testRTMP);

// Manual code input for Desktop OAuth flow
router.post('/auth/manual-code', youtubeSimulcastController.handleManualCode);


module.exports = router;
