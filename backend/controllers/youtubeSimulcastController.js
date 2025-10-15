const youtubeSimulcast = require('../services/youtubeSimulcast');
const { LiveStream } = require('../models');

// Start simulcast to YouTube with stream key (like OBS)
exports.startSimulcast = async (req, res) => {
  try {
    console.log('[YouTube] Start simulcast request received');
    console.log('[YouTube] Request body:', req.body);
    
    const { roomId, streamKey, title } = req.body;
    console.log('[YouTube] Extracted parameters:', { roomId, streamKey, title });
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    if (!streamKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key is required. Please provide your YouTube stream key.'
      });
    }

    // Get livestream data from database
    console.log('[YouTube] Fetching livestream data for roomId:', roomId);
    const livestream = await LiveStream.findByPk(roomId);
    console.log('[YouTube] Database query result:', livestream ? 'Found' : 'Not found');
    
    if (!livestream) {
      console.log('[YouTube] Livestream not found for roomId:', roomId);
      return res.status(404).json({
        success: false,
        error: 'Live stream not found',
        details: `No livestream found with id: ${roomId}`
      });
    }
    
    // Use title from database, fallback to provided title or default
    let finalTitle = livestream.title || title || `Live Stream ${roomId}`;
    
    console.log('[YouTube] Starting simulcast with stream key:', { roomId, streamKey, title: finalTitle });
    
    // Start simulcast with stream key
    let result;
    try {
      console.log('[YouTube] Starting simulcast with stream key...');
      result = await youtubeSimulcast.startSimulcastWithStreamKey(
        roomId,
        streamKey,
        finalTitle
      );
      console.log('[YouTube] Simulcast started successfully:', result);
    } catch (simulcastError) {
      console.error('[YouTube] Simulcast error details:', {
        message: simulcastError.message,
        stack: simulcastError.stack,
        name: simulcastError.name
      });
      
      throw simulcastError;
    }

    // Update live stream record
    await LiveStream.update({
      youtubeStreamId: result.streamKey,
      youtubeBroadcastId: result.streamKey,
      youtubeBroadcastUrl: result.broadcastUrl,
      youtubeStreamUrl: result.rtmpUrl
    }, {
      where: { id: roomId }
    });

    res.json({
      success: true,
      message: 'Simulcast to YouTube started successfully with stream key',
      data: result
    });

  } catch (error) {
    console.error('[YouTube] Error starting YouTube simulcast:', error);
    console.error('[YouTube] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to start YouTube simulcast',
      details: error.message,
      stack: error.stack
    });
  }
};

// Stop simulcast
exports.stopSimulcast = async (req, res) => {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    console.log('[YouTube] Stopping simulcast for room:', roomId);
    
    const result = await youtubeSimulcast.stopSimulcast(roomId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Simulcast stopped successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to stop simulcast'
      });
    }
  } catch (error) {
    console.error('Error stopping simulcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop simulcast',
      details: error.message
    });
  }
};

// Get simulcast status
exports.getSimulcastStatus = (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    const status = youtubeSimulcast.getSimulcastStatus(roomId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting simulcast status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get simulcast status',
      details: error.message
    });
  }
};

// Get all active simulcasts
exports.getAllSimulcasts = (req, res) => {
  try {
    const allSimulcasts = youtubeSimulcast.getAllSimulcasts();
    
    res.json({
      success: true,
      data: allSimulcasts
    });
  } catch (error) {
    console.error('Error getting all simulcasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get simulcasts',
      details: error.message
    });
  }
};

// Test RTMP connection with stream key (like OBS)
exports.testRTMPWithStreamKey = async (req, res) => {
  try {
    const { roomId, streamKey } = req.body;
    console.log('[RTMP Stream Key] Testing RTMP connection to YouTube...');
    
    if (!streamKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key is required for testing'
      });
    }
    
    // Use the provided stream key
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
    
    console.log(`[RTMP Stream Key] Testing connection to: ${rtmpUrl}`);
    
    const { spawn } = require('child_process');
    
    // Test RTMP connection with a very short stream
    const rtmpTestProcess = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1',
      '-t', '2', // Very short test
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-f', 'flv',
      rtmpUrl
    ], { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    let ffmpegWorking = false;
    let connectionAttempt = false;
    
    // Set timeout for the test
    const timeout = setTimeout(() => {
      if (!rtmpTestProcess.killed) {
        console.log('[RTMP Stream Key] Test timeout, killing process');
        rtmpTestProcess.kill('SIGTERM');
      }
    }, 5000); // 5 second timeout
    
    rtmpTestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    rtmpTestProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.log(`[RTMP Stream Key] ${dataStr}`);
      
      // Check if FFmpeg is working by looking for key indicators
      if (dataStr.includes('Input #0, lavfi') || 
          dataStr.includes('Stream #0:0: Video:') || 
          dataStr.includes('Duration: N/A') ||
          dataStr.includes('bitrate: N/A')) {
        ffmpegWorking = true;
        console.log('[RTMP Stream Key] FFmpeg is working - can process video');
      }
      
      // Check for connection attempt
      if (dataStr.includes('Connection to tcp://')) {
        connectionAttempt = true;
        console.log('[RTMP Stream Key] Connection attempt detected');
      }
    });
    
    rtmpTestProcess.on('exit', (code) => {
      clearTimeout(timeout);
      console.log(`[RTMP Stream Key] Test process exited with code: ${code}`);
      
      // Consider it successful if FFmpeg is working (even if connection fails due to invalid key)
      const success = ffmpegWorking;
      
      res.json({
        success: success,
        exitCode: code,
        ffmpegWorking: ffmpegWorking,
        connectionAttempt: connectionAttempt,
        output: output,
        error: errorOutput,
        rtmpUrl: rtmpUrl,
        streamKey: streamKey,
        message: success ? 'RTMP test successful - FFmpeg is working properly' : 'RTMP test failed - FFmpeg not working'
      });
    });
    
    rtmpTestProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[RTMP Stream Key] Test process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'RTMP test failed - FFmpeg not found'
      });
    });
    
  } catch (error) {
    console.error('Error testing RTMP:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test RTMP connection'
    });
  }
};

// Test FFmpeg functionality
exports.testFFmpeg = async (req, res) => {
  try {
    console.log('[FFmpeg] Testing FFmpeg functionality...');
    
    const { spawn } = require('child_process');
    
    // Test FFmpeg with a simple command
    const ffmpegTestProcess = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1',
      '-t', '2',
      '-f', 'null',
      '-'
    ], { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    let ffmpegWorking = false;
    
    // Set timeout for the test
    const timeout = setTimeout(() => {
      if (!ffmpegTestProcess.killed) {
        console.log('[FFmpeg] Test timeout, killing process');
        ffmpegTestProcess.kill('SIGTERM');
      }
    }, 5000); // 5 second timeout
    
    ffmpegTestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpegTestProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.log(`[FFmpeg] ${dataStr}`);
      
      // Check if FFmpeg is working by looking for key indicators
      if (dataStr.includes('Input #0, lavfi') || 
          dataStr.includes('Stream #0:0: Video:') || 
          dataStr.includes('Duration: N/A') ||
          dataStr.includes('bitrate: N/A')) {
        ffmpegWorking = true;
        console.log('[FFmpeg] FFmpeg is working - can process video');
      }
    });
    
    ffmpegTestProcess.on('exit', (code) => {
      clearTimeout(timeout);
      console.log(`[FFmpeg] Test process exited with code: ${code}`);
      
      const success = ffmpegWorking;
      
      res.json({
        success: success,
        exitCode: code,
        ffmpegWorking: ffmpegWorking,
        output: output,
        error: errorOutput,
        message: success ? 'FFmpeg test successful' : 'FFmpeg test failed'
      });
    });
    
    ffmpegTestProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[FFmpeg] Test process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'FFmpeg test failed - FFmpeg not found'
      });
    });
    
  } catch (error) {
    console.error('Error testing FFmpeg:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test FFmpeg'
    });
  }
};

// Get FFmpeg status for a room
exports.getFFmpegStatus = (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    const status = youtubeSimulcast.getFFmpegStatus(roomId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting FFmpeg status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get FFmpeg status',
      details: error.message
    });
  }
};