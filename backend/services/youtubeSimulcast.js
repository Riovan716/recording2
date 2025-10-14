const { google } = require('googleapis');
const { spawn } = require('child_process');
const path = require('path');

class YouTubeSimulcast {
  constructor() {
    this.youtube = null;
    this.oauth2Client = null;
    this.isConfigured = false;
    this.activeStreams = new Map(); // { roomId: { process, streamId, broadcastId } }
    // Removed rate limiting - not needed for YouTube API
    this.loadConfig();
  }

  loadConfig() {
    try {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.log('YouTube API credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables.');
        return;
      }

      // For Desktop application, use out-of-band redirect URI
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      // Set default scopes
      this.oauth2Client.on('tokens', (tokens) => {
        console.log('[YouTube] Tokens refreshed:', !!tokens.access_token);
      });

      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      this.isConfigured = true;
      console.log('YouTube Simulcast API configured successfully');
    } catch (error) {
      console.error('Error configuring YouTube Simulcast API:', error);
      this.isConfigured = false;
    }
  }

  // Set tokens for authenticated requests
  setTokens(tokens) {
    if (!this.isConfigured) {
      throw new Error('YouTube API not configured');
    }
    
    console.log('[YouTube] Setting tokens:', {
      hasAccessToken: !!tokens?.access_token,
      hasRefreshToken: !!tokens?.refresh_token,
      tokenType: tokens?.token_type,
      expiryDate: tokens?.expiry_date
    });
    
    // Validate tokens before setting
    if (!tokens || !tokens.access_token) {
      throw new Error('Invalid tokens: access_token is required');
    }
    
    this.oauth2Client.setCredentials(tokens);
    
    // Verify tokens are set
    const credentials = this.oauth2Client.credentials;
    console.log('[YouTube] Tokens set successfully:', {
      hasAccessToken: !!credentials?.access_token,
      hasRefreshToken: !!credentials?.refresh_token,
      expiryDate: credentials?.expiry_date
    });
    
    // Check if token is expired
    if (credentials?.expiry_date && credentials.expiry_date < Date.now()) {
      console.warn('[YouTube] Access token is expired, refresh may be needed');
    }
  }

  // Removed rate limiting helper - not needed

  // Simple error handling for YouTube API calls
  async makeYouTubeRequest(requestFn) {
    try {
      // Check if token needs refresh before making request
      const credentials = this.oauth2Client.credentials;
      if (credentials?.expiry_date && credentials.expiry_date < Date.now() && credentials.refresh_token) {
        console.log('[YouTube] Access token expired, attempting refresh...');
        try {
          const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
          console.log('[YouTube] Token refreshed successfully');
        } catch (refreshError) {
          console.error('[YouTube] Token refresh failed:', refreshError.message);
          throw new Error('YouTube authentication expired. Please re-authenticate.');
        }
      }
      
      const result = await requestFn();
      
      // Validate result
      if (!result) {
        throw new Error('YouTube API returned empty response');
      }
      
      console.log('[YouTube] API request successful');
      return result;
    } catch (error) {
      console.error('[YouTube] API request failed:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data
      });
      
      // Handle specific YouTube API errors
      if (error.message && error.message.includes('quota')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      }
      
      if (error.message && error.message.includes('invalid_grant')) {
        throw new Error('YouTube authentication expired. Please re-authenticate.');
      }
      
      if (error.message && error.message.includes('forbidden')) {
        throw new Error('YouTube API access forbidden. Please check your permissions.');
      }
      
      // Handle 401 Unauthorized - token expired
      if (error.status === 401 || error.code === 401) {
        throw new Error('YouTube authentication expired. Please re-authenticate.');
      }
      
      // Handle rate limit errors from YouTube API
      if (error.message && error.message.includes('rate limit')) {
        throw new Error('YouTube API temporarily unavailable. Please try again in a few moments.');
      }
      
      throw error;
    }
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      'quota',
      'timeout',
      'network',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    return retryableErrors.some(retryableError => 
      error.message && error.message.toLowerCase().includes(retryableError)
    );
  }

  // Get authorization URL for OAuth2 (Desktop flow)
  getAuthUrl() {
    if (!this.isConfigured) {
      throw new Error('YouTube API not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    // Generate auth URL for desktop OAuth flow
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('[YouTube] Generated auth URL with scopes:', scopes);
    return authUrl;
  }

  // Exchange authorization code for tokens (Desktop flow)
  async exchangeCodeForTokens(code) {
    if (!this.isConfigured) {
      throw new Error('YouTube API not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Create YouTube live stream and broadcast
  async createLiveStream(title, description) {
    if (!this.isConfigured) {
      throw new Error('YouTube API not configured');
    }

    if (!this.youtube) {
      throw new Error('YouTube client not initialized');
    }

    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    try {
      console.log('Creating YouTube live stream...');
      
      // Ensure title is not empty
      const finalTitle = title && title.trim() !== '' ? title : `Live Stream ${Date.now()}`;
      const finalDescription = description && description.trim() !== '' ? description : `Live stream started at ${new Date().toISOString()}`;
      
      console.log('DEBUG: Final values for YouTube API:', {
        finalTitle: finalTitle,
        finalDescription: finalDescription
      });
      
      // Check OAuth credentials before making API call
      const credentials = this.oauth2Client.credentials;
      console.log('[YouTube] Current OAuth credentials:', {
        hasAccessToken: !!credentials?.access_token,
        hasRefreshToken: !!credentials?.refresh_token,
        tokenType: credentials?.token_type,
        expiryDate: credentials?.expiry_date
      });

      if (!credentials?.access_token) {
        throw new Error('No valid access token found. Please re-authenticate with YouTube.');
      }

      // Try to create live stream first (simpler approach)
      console.log('Creating live stream...');
      let streamResponse;
      try {
        streamResponse = await this.youtube.liveStreams.insert({
          part: 'snippet,cdn,status',
          requestBody: {
            snippet: {
              title: finalTitle,
              description: finalDescription
            },
            cdn: {
              ingestionType: 'rtmp',
              resolution: '1080p',
              frameRate: '30fps'
            },
            status: {
              privacyStatus: 'unlisted'
            }
          }
        });
        console.log('Stream response received:', streamResponse);
      } catch (streamError) {
        console.error('Stream creation failed:', streamError);
        throw new Error(`Failed to create YouTube live stream: ${streamError.message}`);
      }
      
      if (!streamResponse || !streamResponse.data || !streamResponse.data.id) {
        throw new Error('Failed to create YouTube live stream: Invalid response from YouTube API');
      }
      
      console.log('Live stream created successfully:', streamResponse.data.id);

      // Create live broadcast
      console.log('Creating live broadcast...');
      let broadcastResponse;
      try {
        const now = new Date();
        const startTime = new Date(now.getTime() - 60000); // Start 1 minute ago
        
        broadcastResponse = await this.youtube.liveBroadcasts.insert({
          part: 'snippet,status',
          requestBody: {
            snippet: {
              title: finalTitle,
              description: finalDescription,
              scheduledStartTime: startTime.toISOString()
            },
            status: {
              privacyStatus: 'unlisted',
              selfDeclaredMadeForKids: false
            }
          }
        });
        console.log('Broadcast response received:', broadcastResponse);
      } catch (broadcastError) {
        console.error('Broadcast creation failed:', broadcastError);
        throw new Error(`Failed to create YouTube live broadcast: ${broadcastError.message}`);
      }
      
      if (!broadcastResponse || !broadcastResponse.data || !broadcastResponse.data.id) {
        throw new Error('Failed to create YouTube live broadcast: Invalid response from YouTube API');
      }
      
      console.log('Live broadcast created successfully:', broadcastResponse.data.id);

      // Bind stream to broadcast
      console.log('Binding stream to broadcast...');
      try {
        await this.youtube.liveBroadcasts.bind({
          part: 'id,snippet',
          id: broadcastResponse.data.id,
          streamId: streamResponse.data.id
        });
        console.log('Stream bound to broadcast successfully');
      } catch (bindError) {
        console.error('Binding failed:', bindError);
        throw new Error(`Failed to bind stream to broadcast: ${bindError.message}`);
      }

      // Wait for binding to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Validate required data before creating result
      if (!streamResponse.data.cdn || !streamResponse.data.cdn.ingestionInfo) {
        throw new Error('Failed to get stream ingestion info from YouTube API');
      }
      
      const result = {
        success: true,
        streamId: streamResponse.data.id,
        broadcastId: broadcastResponse.data.id,
        streamUrl: streamResponse.data.cdn.ingestionInfo.ingestionAddress,
        streamKey: streamResponse.data.cdn.ingestionInfo.streamName,
        broadcastUrl: `https://www.youtube.com/watch?v=${broadcastResponse.data.id}`
      };
      
      console.log('YouTube live stream creation completed successfully');
      console.log('Result:', result);
      return result;
    } catch (error) {
      console.error('Error creating YouTube live stream:', error);
      
      // Handle rate limit errors from YouTube API
      if (error.message && error.message.includes('rate limit')) {
        throw new Error('YouTube API temporarily unavailable. Please try again in a few moments.');
      }
      
      throw error;
    }
  }

  // Fallback stream with test pattern
  startFallbackStream(roomId, rtmpUrl) {
    console.log(`[YouTube] Starting fallback stream for room ${roomId}`);
    
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=1920x1080:rate=30', // Test pattern video
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000', // Test tone audio
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-g', '60',
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-s', '1920x1080',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-f', 'flv',
      rtmpUrl
    ];
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Store process info
    this.activeStreams.set(roomId, {
      process: ffmpegProcess,
      streamId: 'fallback',
      broadcastId: 'fallback',
      rtmpUrl: rtmpUrl,
      broadcastUrl: 'https://www.youtube.com/live'
    });
    
    console.log(`[YouTube] Fallback stream started for room ${roomId}`);
  }

  // Start RTMP relay to YouTube (Dual Streaming)
  async startSimulcast(roomId, title, description) {
    try {
      // Create YouTube live stream
      const liveStream = await this.createLiveStream(title, description);
      
      // Start FFmpeg process to relay MediaSoup stream to YouTube
      const rtmpUrl = `${liveStream.streamUrl}/${liveStream.streamKey}`;
      
      // FFmpeg command to stream REAL VIDEO from MediaSoup to YouTube
      // First try to connect to MediaSoup stream, fallback to test pattern if needed
      const mediaSoupUrl = `http://192.168.1.21:8000/stream/${roomId}`;
      
      const ffmpegArgs = [
        '-f', 'webm',
        '-i', mediaSoupUrl, // REAL VIDEO from MediaSoup
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-b:v', '2500k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-g', '60',
        '-keyint_min', '60',
        '-sc_threshold', '0',
        '-s', '1920x1080', // Explicit resolution
        '-r', '30', // Explicit frame rate
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '48000',
        '-f', 'flv',
        rtmpUrl
      ];
      
      console.log(`[YouTube] Attempting to stream REAL VIDEO from MediaSoup: ${mediaSoupUrl}`);
      console.log(`[YouTube] RTMP URL: ${rtmpUrl}`);
      console.log(`[YouTube] Stream URL: ${liveStream.streamUrl}`);
      console.log(`[YouTube] Stream Key: ${liveStream.streamKey}`);

      console.log('Starting FFmpeg with RTMP URL:', rtmpUrl);
      console.log('FFmpeg arguments:', ffmpegArgs);
      
      // Check if FFmpeg is available
      try {
        console.log('[FFmpeg] Checking FFmpeg availability...');
        const ffmpegCheck = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
        
        ffmpegCheck.on('error', (error) => {
          console.error('[FFmpeg] FFmpeg not found! Please install FFmpeg:', error.message);
          throw new Error('FFmpeg not installed or not in PATH');
        });
        
        ffmpegCheck.on('exit', (code) => {
          if (code === 0) {
            console.log('[FFmpeg] FFmpeg is available and working');
          } else {
            console.error(`[FFmpeg] FFmpeg check failed with exit code: ${code}`);
          }
        });
        
        // Wait a moment for the check to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('[FFmpeg] Error checking FFmpeg:', error);
        throw error;
      }
      
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Enhanced logging for FFmpeg process
      console.log(`[YouTube] FFmpeg process started with PID: ${ffmpegProcess.pid}`);
      console.log(`[YouTube] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
      
      // Immediate process validation
      if (!ffmpegProcess.pid) {
        console.error('[FFmpeg] Process failed to start - no PID assigned');
        throw new Error('FFmpeg process failed to start');
      }
      
      console.log(`[FFmpeg] Process successfully started with PID: ${ffmpegProcess.pid}`);
      
      // Test RTMP connection to YouTube
      console.log('[FFmpeg] Testing RTMP connection to YouTube...');
      const rtmpTestProcess = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'testsrc2=size=320x240:rate=1',
        '-t', '3',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-f', 'flv',
        rtmpUrl
      ], { stdio: 'pipe' });
      
      rtmpTestProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('[FFmpeg] RTMP test connection successful');
        } else {
          console.error(`[FFmpeg] RTMP test connection failed with code: ${code}`);
        }
      });
      
      rtmpTestProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[FFmpeg RTMP Test] ${output}`);
        
        if (output.includes('Connection to tcp://')) {
          console.log('[FFmpeg] RTMP connection attempt detected');
        }
        if (output.includes('Stream mapping')) {
          console.log('[FFmpeg] RTMP stream mapping successful');
        }
        if (output.includes('Press [q] to stop')) {
          console.log('[FFmpeg] RTMP stream started successfully!');
        }
      });
      
      // Kill the test process after 5 seconds
      setTimeout(() => {
        if (!rtmpTestProcess.killed) {
          console.log('[FFmpeg] Stopping RTMP test process');
          rtmpTestProcess.kill();
        }
      }, 5000);
      
      // Log FFmpeg output in real-time
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[FFmpeg] ${output}`);
        
        // Check for connection success
        if (output.includes('Connection to tcp://')) {
          console.log('[FFmpeg] RTMP connection attempt detected');
        }
        if (output.includes('Stream mapping')) {
          console.log('[FFmpeg] Stream mapping successful');
        }
        if (output.includes('Press [q] to stop')) {
          console.log('[FFmpeg] Stream started successfully!');
        }
        if (output.includes('Connection refused')) {
          console.error('[FFmpeg] Connection refused - check RTMP URL');
        }
        if (output.includes('Permission denied')) {
          console.error('[FFmpeg] Permission denied - check stream key');
        }
        if (output.includes('Invalid data found')) {
          console.error('[FFmpeg] Invalid data found - check input format');
        }
      });
      
      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`[FFmpeg STDOUT] ${data.toString()}`);
      });

      // Store process info
      this.activeStreams.set(roomId, {
        process: ffmpegProcess,
        streamId: liveStream.streamId,
        broadcastId: liveStream.broadcastId,
        rtmpUrl: rtmpUrl,
        broadcastUrl: liveStream.broadcastUrl
      });

      console.log('FFmpeg process started successfully');

      // Handle process events
      ffmpegProcess.on('error', (error) => {
        console.error(`[FFmpeg] Process error for room ${roomId}:`, error);
        
        // If MediaSoup stream fails, try fallback to test pattern
        if (error.message && (error.message.includes('Connection refused') || error.message.includes('No such file'))) {
          console.log(`[YouTube] MediaSoup stream not available, using test pattern fallback`);
          this.startFallbackStream(roomId, rtmpUrl);
        } else {
          this.activeStreams.delete(roomId);
        }
      });

      ffmpegProcess.on('exit', (code) => {
        console.log(`[FFmpeg] Process exited for room ${roomId} with code ${code}`);
        if (code !== 0) {
          console.error(`[FFmpeg] Process exited with error code: ${code}`);
        }
        this.activeStreams.delete(roomId);
      });
      
      // Check if process is still running after 5 seconds
      setTimeout(() => {
        if (ffmpegProcess && !ffmpegProcess.killed) {
          console.log(`[FFmpeg] Process is still running for room ${roomId} - YouTube should receive data`);
        } else {
          console.error(`[FFmpeg] Process died for room ${roomId}`);
        }
      }, 5000);
      
      // Additional validation - check if FFmpeg can connect to YouTube
      setTimeout(() => {
        console.log(`[FFmpeg] Validating RTMP connection to: ${rtmpUrl}`);
        console.log(`[FFmpeg] Process PID: ${ffmpegProcess.pid}`);
        console.log(`[FFmpeg] Process killed: ${ffmpegProcess.killed}`);
        console.log(`[FFmpeg] Process exit code: ${ffmpegProcess.exitCode}`);
      }, 2000);

      // Log FFmpeg output
      ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg output for room ${roomId}:`, data.toString());
      });

      console.log(`Simulcast started for room ${roomId}: ${liveStream.broadcastUrl}`);
      
      return {
        success: true,
        roomId: roomId,
        streamId: liveStream.streamId,
        broadcastId: liveStream.broadcastId,
        broadcastUrl: liveStream.broadcastUrl,
        rtmpUrl: rtmpUrl
      };

    } catch (error) {
      console.error('Error starting simulcast:', error);
      throw error;
    }
  }

  // Stop simulcast
  async stopSimulcast(roomId) {
    const streamInfo = this.activeStreams.get(roomId);
    
    if (!streamInfo) {
      throw new Error(`No active simulcast found for room ${roomId}`);
    }

    try {
      // Kill FFmpeg process
      streamInfo.process.kill('SIGTERM');
      
      // Remove from active streams
      this.activeStreams.delete(roomId);
      
      console.log(`Simulcast stopped for room ${roomId}`);
      
      return {
        success: true,
        roomId: roomId
      };
    } catch (error) {
      console.error('Error stopping simulcast:', error);
      throw error;
    }
  }

  // Get simulcast status
  getSimulcastStatus(roomId) {
    const streamInfo = this.activeStreams.get(roomId);
    
    return {
      isActive: !!streamInfo,
      streamId: streamInfo?.streamId,
      broadcastId: streamInfo?.broadcastId,
      broadcastUrl: streamInfo?.broadcastUrl,
      rtmpUrl: streamInfo?.rtmpUrl
    };
  }

  // Get all active simulcasts
  getAllActiveSimulcasts() {
    const result = {};
    for (const [roomId, streamInfo] of this.activeStreams) {
      result[roomId] = {
        streamId: streamInfo.streamId,
        broadcastId: streamInfo.broadcastId,
        broadcastUrl: streamInfo.broadcastUrl,
        rtmpUrl: streamInfo.rtmpUrl,
        isRunning: !streamInfo.process.killed,
        pid: streamInfo.process.pid
      };
    }
    return result;
  }

  // Get FFmpeg process status
  getFFmpegStatus(roomId) {
    const streamInfo = this.activeStreams.get(roomId);
    if (!streamInfo) {
      return { isRunning: false, error: 'No active stream found' };
    }
    
    return {
      isRunning: !streamInfo.process.killed,
      pid: streamInfo.process.pid,
      streamId: streamInfo.streamId,
      broadcastId: streamInfo.broadcastId,
      rtmpUrl: streamInfo.rtmpUrl
    };
  }

  // Check if YouTube API is configured
  isReady() {
    return this.isConfigured;
  }
}

module.exports = new YouTubeSimulcast();
