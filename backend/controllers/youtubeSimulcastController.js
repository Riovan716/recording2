const youtubeSimulcast = require('../services/youtubeSimulcast');
const { LiveStream } = require('../models');

// Start simulcast to YouTube
exports.startSimulcast = async (req, res) => {
  try {
    console.log('[YouTube] Start simulcast request received');
    console.log('[YouTube] Request body:', req.body);
    console.log('[YouTube] Request headers:', req.headers);
    
    const { roomId, title, description } = req.body;
    console.log('[YouTube] Extracted parameters:', { roomId, title, description });
    console.log('[YouTube] Title type:', typeof title, 'Title value:', title);
    console.log('[YouTube] Title length:', title ? title.length : 'null/undefined');
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    // Get livestream data from database
    console.log('[YouTube] Fetching livestream data for roomId:', roomId);
    console.log('[YouTube] RoomId type:', typeof roomId, 'Length:', roomId ? roomId.length : 'null/undefined');
    
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
    
    console.log('[YouTube] Livestream data:', {
      id: livestream.id,
      title: livestream.title,
      status: livestream.status,
      titleType: typeof livestream.title,
      titleLength: livestream.title ? livestream.title.length : 'null/undefined'
    });
    
    // Use title from database, fallback to provided title or default
    let finalTitle = livestream.title;
    
    // If database title is empty, null, or undefined, use fallback
    if (!finalTitle || finalTitle.trim() === '') {
      console.log('[YouTube] Database title is empty, using fallback');
      finalTitle = title || `Live Stream ${roomId}`;
    }
    
    // Final fallback if everything is empty
    if (!finalTitle || finalTitle.trim() === '') {
      finalTitle = `Live Stream ${roomId}`;
    }
    
    const finalDescription = description || `Live stream from room ${roomId}`;
    
    console.log('[YouTube] Final title decision:', {
      databaseTitle: livestream.title,
      providedTitle: title,
      finalTitle: finalTitle,
      finalTitleLength: finalTitle.length,
      finalTitleTrimmed: finalTitle.trim()
    });
    console.log('[YouTube] Using final description:', finalDescription);

    if (!youtubeSimulcast.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'YouTube API not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables.'
      });
    }

    // Get tokens from Authorization header (YouTube tokens)
    const authHeader = req.headers.authorization;
    console.log('[YouTube] Authorization header:', authHeader);
    
    let tokens = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const tokenData = authHeader.replace('Bearer ', '');
        console.log('[YouTube] Token data (first 100 chars):', tokenData.substring(0, 100));
        tokens = JSON.parse(tokenData);
        console.log('[YouTube] Parsed tokens:', !!tokens, 'Has access_token:', !!tokens?.access_token);
      } catch (e) {
        console.log('[YouTube] Error parsing YouTube tokens from header:', e.message);
      }
    }
    
    if (!tokens || !tokens.access_token) {
      console.log('[YouTube] No valid tokens found');
      return res.status(400).json({
        success: false,
        error: 'YouTube tokens required in Authorization header'
      });
    }

    console.log('[YouTube] Setting tokens...');
    youtubeSimulcast.setTokens(tokens);
    console.log('[YouTube] Tokens set successfully');

    // Start simulcast
    console.log('[YouTube] Starting simulcast with:', { roomId, title: finalTitle, description: finalDescription });
    console.log('[YouTube] Final title validation:', {
      title: finalTitle,
      type: typeof finalTitle,
      length: finalTitle ? finalTitle.length : 'null/undefined',
      trimmed: finalTitle ? finalTitle.trim() : 'null/undefined',
      isEmpty: !finalTitle || finalTitle.trim() === ''
    });
    
    console.log('[YouTube] About to call startSimulcast with:', {
      roomId,
      finalTitle,
      finalDescription,
      titleLength: finalTitle.length,
      titleTrimmed: finalTitle.trim()
    });
    
    let result;
    try {
      console.log('[YouTube] Starting simulcast...');
      result = await youtubeSimulcast.startSimulcast(
        roomId,
        finalTitle,
        finalDescription
      );
      console.log('[YouTube] Simulcast started successfully:', result);
    } catch (simulcastError) {
      console.error('[YouTube] Simulcast error details:', {
        message: simulcastError.message,
        stack: simulcastError.stack,
        name: simulcastError.name
      });
      
      // Handle specific YouTube API errors
      if (simulcastError.message && simulcastError.message.includes('quota')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      }
      
      if (simulcastError.message && simulcastError.message.includes('invalid_grant')) {
        throw new Error('YouTube authentication expired. Please re-authenticate.');
      }
      
      if (simulcastError.message && simulcastError.message.includes('forbidden')) {
        throw new Error('YouTube API access forbidden. Please check your permissions.');
      }
      
      // Handle rate limit errors from YouTube API
      if (simulcastError.message && simulcastError.message.includes('rate limit')) {
        throw new Error('YouTube API temporarily unavailable. Please try again in a few moments.');
      }
      
      throw simulcastError;
    }

    // Update live stream record
    await LiveStream.update({
      youtubeStreamId: result.streamId,
      youtubeBroadcastId: result.broadcastId,
      youtubeBroadcastUrl: result.broadcastUrl,
      youtubeStreamUrl: result.rtmpUrl
    }, {
      where: { id: roomId }
    });

    res.json({
      success: true,
      message: 'Simulcast to YouTube started successfully',
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

    // Stop simulcast
    const result = await youtubeSimulcast.stopSimulcast(roomId);

    // Update live stream record
    await LiveStream.update({
      youtubeStreamId: null,
      youtubeBroadcastId: null,
      youtubeBroadcastUrl: null,
      youtubeStreamUrl: null
    }, {
      where: { id: roomId }
    });

    res.json({
      success: true,
      message: 'Simulcast to YouTube stopped successfully',
      data: result
    });

  } catch (error) {
    console.error('Error stopping YouTube simulcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop YouTube simulcast',
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
    const simulcasts = youtubeSimulcast.getAllActiveSimulcasts();

    res.json({
      success: true,
      data: simulcasts
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

// Test RTMP connection to YouTube
exports.testRTMP = async (req, res) => {
  try {
    const { roomId } = req.body;
    console.log('[RTMP] Testing RTMP connection to YouTube...');
    
    // Get current live stream info
    const simulcastStatus = youtubeSimulcast.getSimulcastStatus(roomId);
    if (!simulcastStatus.isActive) {
      return res.status(400).json({
        success: false,
        error: 'No active simulcast found. Please start simulcast first.'
      });
    }
    
    const { spawn } = require('child_process');
    const rtmpUrl = simulcastStatus.rtmpUrl;
    
    console.log(`[RTMP] Testing connection to: ${rtmpUrl}`);
    
    // Test RTMP connection with a short stream
    const rtmpTestProcess = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1',
      '-t', '3',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-f', 'flv',
      rtmpUrl
    ], { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    let connectionSuccess = false;
    
    rtmpTestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    rtmpTestProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.log(`[RTMP Test] ${dataStr}`);
      
      if (dataStr.includes('Connection to tcp://')) {
        connectionSuccess = true;
        console.log('[RTMP] Connection attempt detected');
      }
      if (dataStr.includes('Stream mapping')) {
        console.log('[RTMP] Stream mapping successful');
      }
      if (dataStr.includes('Press [q] to stop')) {
        console.log('[RTMP] Stream started successfully!');
      }
    });
    
    rtmpTestProcess.on('exit', (code) => {
      console.log(`[RTMP] Test process exited with code: ${code}`);
      
      res.json({
        success: code === 0 && connectionSuccess,
        exitCode: code,
        connectionSuccess: connectionSuccess,
        output: output,
        error: errorOutput,
        rtmpUrl: rtmpUrl,
        message: code === 0 && connectionSuccess ? 'RTMP connection successful' : 'RTMP connection failed'
      });
    });
    
    rtmpTestProcess.on('error', (error) => {
      console.error('[RTMP] Test process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'RTMP test failed'
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
    const testProcess = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1',
      '-t', '2',
      '-f', 'null',
      '-'
    ], { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('exit', (code) => {
      console.log(`[FFmpeg] Test process exited with code: ${code}`);
      console.log(`[FFmpeg] Output: ${output}`);
      console.log(`[FFmpeg] Error: ${errorOutput}`);
      
      res.json({
        success: code === 0,
        exitCode: code,
        output: output,
        error: errorOutput,
        message: code === 0 ? 'FFmpeg test successful' : 'FFmpeg test failed'
      });
    });
    
    testProcess.on('error', (error) => {
      console.error('[FFmpeg] Test process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'FFmpeg not found or not accessible'
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

// Get FFmpeg process status
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

// Get YouTube integration status
exports.getStatus = (req, res) => {
  try {
    console.log('Getting YouTube status...');
    const isConfigured = youtubeSimulcast.isReady();
    console.log('YouTube configured:', isConfigured);
    
    
    // Check for tokens in request body or Authorization header
    const bodyTokens = req.body?.tokens;
    const authHeader = req.headers.authorization;
    let headerTokens = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const tokenData = authHeader.replace('Bearer ', '');
        headerTokens = JSON.parse(tokenData);
      } catch (e) {
        // Ignore invalid JSON
      }
    }
    
    const hasTokens = !!(bodyTokens || headerTokens);
    console.log('Has tokens:', hasTokens);

    res.json({
      success: true,
      isConfigured: isConfigured,
      hasTokens: hasTokens,
      isReady: isConfigured && hasTokens,
      message: isConfigured ? 'YouTube API configured' : 'YouTube API not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables.'
    });
  } catch (error) {
    console.error('Error getting YouTube status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get YouTube status',
      details: error.message
    });
  }
};

// Get YouTube authorization URL (Desktop flow)
exports.getAuthUrl = (req, res) => {
  try {
    if (!youtubeSimulcast.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'YouTube API not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables.'
      });
    }

    const authUrl = youtubeSimulcast.getAuthUrl();

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Desktop OAuth flow - copy authorization code manually'
    });
  } catch (error) {
    console.error('Error getting YouTube auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get YouTube authorization URL',
      details: error.message
    });
  }
};

// Handle YouTube OAuth callback
exports.handleCallback = async (req, res) => {
  try {
    console.log('YouTube OAuth callback received');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const { code } = req.query;
    
    if (!code) {
      console.log('No authorization code provided');
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      });
    }
    
    console.log('Authorization code received:', code);

    console.log('Getting tokens from Google...');
    const tokens = await youtubeSimulcast.oauth2Client.getToken(code);
    console.log('Tokens received from Google:', Object.keys(tokens.tokens));
    
    // Tokens will be handled by frontend localStorage
    
    // Return HTML page that shows success and stores tokens
    console.log('Preparing HTML response...');
    const tokensJson = JSON.stringify(tokens.tokens).replace(/'/g, "\\'").replace(/"/g, '\\"');
    console.log('Tokens JSON prepared, length:', tokensJson.length);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>YouTube Authentication Success</title>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 90%;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: #4CAF50;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #2c3e50;
          }
          .message {
            font-size: 16px;
            color: #666;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          .countdown {
            font-size: 14px;
            color: #999;
            margin-top: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .error {
            color: #e74c3c;
            font-size: 14px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <div class="title">Authentication Successful!</div>
          <div class="message">YouTube authentication completed successfully.</div>
          <div class="spinner"></div>
          <div class="message">Saving credentials...</div>
          <div class="countdown" id="countdown">Closing in 3 seconds...</div>
        </div>
        <script>
          console.log('YouTube callback page loaded');
          
          let countdown = 3;
          const countdownElement = document.getElementById('countdown');
          
          const updateCountdown = () => {
            countdownElement.textContent = 'Closing in ' + countdown + ' seconds...';
            countdown--;
          };
          
          const interval = setInterval(updateCountdown, 1000);
          
          // Store tokens in localStorage
          try {
            console.log('Storing YouTube tokens...');
            localStorage.setItem('youtubeTokens', '${tokensJson}');
            localStorage.setItem('youtubeAuthSuccess', 'true');
            
            console.log('YouTube tokens stored successfully');
            
            // Redirect back to application after countdown
            setTimeout(() => {
              clearInterval(interval);
              console.log('Redirecting back to application...');
              
              // Get return URL from localStorage or use default
              const returnUrl = localStorage.getItem('youtubeAuthReturnUrl') || 'http://192.168.1.21:3000';
              localStorage.removeItem('youtubeAuthReturnUrl');
              localStorage.removeItem('youtubeAuthInProgress');
              
              console.log('Redirecting to:', returnUrl);
              window.location.href = returnUrl;
            }, 2000);
            
          } catch (error) {
            console.error('Error storing tokens:', error);
            clearInterval(interval);
            document.querySelector('.message').innerHTML = 'Error storing tokens. Please try again.';
            document.querySelector('.spinner').style.display = 'none';
            document.getElementById('countdown').innerHTML = '<div class="error">Authentication failed. Please close this window and try again.</div>';
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error handling YouTube callback:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return error page instead of JSON
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>YouTube Authentication Error</title>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: #333;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 90%;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: #e74c3c;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #2c3e50;
          }
          .message {
            font-size: 16px;
            color: #666;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .error-details {
            font-size: 12px;
            color: #999;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 16px;
            text-align: left;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <div class="title">Authentication Failed</div>
          <div class="message">YouTube authentication encountered an error.</div>
          <div class="error-details">
            Error: ${error.message}<br>
            Please close this window and try again.
          </div>
        </div>
        <script>
          console.error('YouTube authentication error:', '${error.message}');
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
      </body>
      </html>
    `);
  }
};

// Store tokens from localStorage
exports.storeTokens = async (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: 'Tokens not provided'
      });
    }

    // Tokens are handled by frontend localStorage
    
    res.json({
      success: true,
      message: 'Tokens stored successfully'
    });
  } catch (error) {
    console.error('Error storing tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store tokens'
    });
  }
};

// Handle manual code input (Desktop flow)
exports.handleManualCode = async (req, res) => {
  try {
    console.log('[YouTube] Manual code request received');
    console.log('[YouTube] Request body:', req.body);
    
    const { code } = req.body;
    
    if (!code) {
      console.log('[YouTube] No authorization code provided');
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }
    
    console.log('[YouTube] Manual code received:', code);
    console.log('[YouTube] YouTube service ready:', youtubeSimulcast.isReady());
    
    // Exchange code for tokens
    console.log('[YouTube] Starting token exchange...');
    const tokens = await youtubeSimulcast.exchangeCodeForTokens(code);
    console.log('[YouTube] Tokens received:', tokens);
    
    console.log('[YouTube] Tokens ready for frontend');
    
    return res.json({
      success: true,
      message: 'YouTube authentication successful',
      tokens: tokens
    });
    
  } catch (error) {
    console.error('[YouTube] Error in manual code handler:', error);
    console.error('[YouTube] Error stack:', error.stack);
    
    // Handle specific OAuth errors
    if (error.message === 'invalid_grant') {
      return res.status(400).json({
        success: false,
        error: 'Authorization code expired or invalid',
        message: 'Please get a new authorization code from Google and try again'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process authorization code'
    });
  }
};
