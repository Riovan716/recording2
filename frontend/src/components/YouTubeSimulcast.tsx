import React, { useState, useEffect } from 'react';
import { FaYoutube, FaPlay, FaStop, FaSpinner, FaCheck, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

// Modal styles
const modalStyles = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    padding: 0;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid #eee;
  }
  
  .input-group {
    margin-top: 16px;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
  }
`;

interface YouTubeSimulcastProps {
  roomId: string;
  streamTitle: string;
  onSimulcastStart?: (broadcastUrl: string) => void;
  onSimulcastStop?: () => void;
  isStreaming?: boolean; // Add streaming status
}

interface StreamKeyStatus {
  isConfigured: boolean;
  hasStreamKey: boolean;
  isReady: boolean;
}


interface SimulcastStatus {
  isActive: boolean;
  streamId?: string;
  broadcastId?: string;
  broadcastUrl?: string;
  rtmpUrl?: string;
}

const YouTubeSimulcast: React.FC<YouTubeSimulcastProps> = ({
  roomId,
  streamTitle,
  onSimulcastStart,
  onSimulcastStop,
  isStreaming = false
}) => {
  const [streamKeyStatus, setStreamKeyStatus] = useState<StreamKeyStatus>({
    isConfigured: true, // Always configured for stream key mode
    hasStreamKey: false,
    isReady: false
  });
  const [simulcastStatus, setSimulcastStatus] = useState<SimulcastStatus>({
    isActive: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKeyInput, setShowStreamKeyInput] = useState(false);

  const API_URL = 'http://192.168.1.22:3000';

  // Helper function to get stream key from localStorage
  const getStreamKey = () => {
    try {
      return localStorage.getItem('youtubeStreamKey') || '';
    } catch (error) {
      console.error('Error getting stream key:', error);
      return '';
    }
  };

  // Helper function to save stream key to localStorage
  const saveStreamKey = (key: string) => {
    try {
      localStorage.setItem('youtubeStreamKey', key);
      setStreamKeyStatus({
        isConfigured: true,
        hasStreamKey: !!key,
        isReady: !!key
      });
    } catch (error) {
      console.error('Error saving stream key:', error);
    }
  };

  // Helper function to create headers
  const createHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // Reset stream key
  const resetStreamKey = () => {
    localStorage.removeItem('youtubeStreamKey');
    setStreamKeyStatus({
      isConfigured: true,
      hasStreamKey: false,
      isReady: false
    });
    showMessage('Stream key reset', 'info');
  };

  // Removed rate limit reset - not needed



  // Check simulcast status
  const checkSimulcastStatus = async () => {
    try {
      console.log('[Frontend] Checking simulcast status for room:', roomId);
      const response = await fetch(`${API_URL}/api/youtube/simulcast/status/${roomId}`, {
        method: 'GET',
        headers: createHeaders(),
      });
      const data = await response.json();
      
      console.log('[Frontend] Simulcast status response:', data);
      
      if (data.success) {
        setSimulcastStatus(data.data);
        console.log('[Frontend] Simulcast status updated:', data.data);
      } else {
        console.log('[Frontend] Simulcast status error:', data.error);
        // Reset simulcast status if there's an error
        setSimulcastStatus({ isActive: false });
      }
    } catch (error) {
      console.error('[Frontend] Error checking simulcast status:', error);
      // Reset simulcast status on error
      setSimulcastStatus({ isActive: false });
    }
  };



  // Removed rate limiting helper - not needed

  // Start simulcast with stream key
  const startSimulcast = async () => {
    console.log('[Frontend] Starting simulcast with stream key...');
    
    // Check if we have stream key
    const currentStreamKey = getStreamKey();
    if (!currentStreamKey) {
      showMessage('Stream key required. Please enter your YouTube stream key first.', 'error');
      setShowStreamKeyInput(true);
      return;
    }

    try {
      setIsStarting(true);
      showMessage('Starting YouTube simulcast with stream key...', 'info');
      
      const headers = createHeaders();
      console.log('[Frontend] Starting simulcast with stream key:', currentStreamKey);
      
      const response = await fetch(`${API_URL}/api/youtube/simulcast/start`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify({
          roomId: roomId,
          streamKey: currentStreamKey,
          title: streamTitle
        })
      });

      const data = await response.json();
      console.log('[Frontend] Simulcast start response:', data);
      
      if (data.success) {
        showMessage(`Simulcast started! Stream key: ${currentStreamKey}`, 'success');
        
        // Update simulcast status
        setSimulcastStatus({
          isActive: true,
          streamId: data.data.streamKey,
          broadcastId: data.data.streamKey,
          broadcastUrl: data.data.broadcastUrl,
          rtmpUrl: data.data.rtmpUrl
        });
        if (onSimulcastStart) {
          onSimulcastStart(data.data.broadcastUrl);
        }
        
        // Refresh status after successful start
        setTimeout(() => {
          checkSimulcastStatus();
        }, 1000);
        
      } else {
        console.error('Simulcast error:', data);
        let errorMessage = data.error || 'Failed to start simulcast';
        
        // Handle specific errors
        if (data.details && data.details.includes('Invalid stream key')) {
          errorMessage = 'Invalid stream key. Please check your YouTube stream key.';
        } else if (data.details && data.details.includes('FFmpeg not found')) {
          errorMessage = 'FFmpeg not found. Please install FFmpeg.';
        }
        
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error starting simulcast:', error);
      showMessage('Failed to start simulcast', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop simulcast
  const stopSimulcast = async () => {
    try {
      setIsStopping(true);
      
      const headers = createHeaders();
      
      const response = await fetch(`${API_URL}/api/youtube/simulcast/stop`, {
        method: 'POST',
        headers: headers,
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          roomId: roomId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('Simulcast stopped successfully', 'success');
        setSimulcastStatus({ isActive: false });
        if (onSimulcastStop) {
          onSimulcastStop();
        }
      } else {
        showMessage(data.error || 'Failed to stop simulcast', 'error');
      }
    } catch (error) {
      console.error('Error stopping simulcast:', error);
      showMessage('Failed to stop simulcast', 'error');
    } finally {
      setIsStopping(false);
    }
  };

  // Show message
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };


  useEffect(() => {
    // Load stream key from localStorage
    const savedStreamKey = getStreamKey();
    if (savedStreamKey) {
      setStreamKeyStatus({
        isConfigured: true,
        hasStreamKey: true,
        isReady: true
      });
    }
    
    checkSimulcastStatus();
    
    // Ensure loading state is reset on component mount
    setIsLoading(false);
    
    // Add modal styles to DOM
    const styleElement = document.createElement('style');
    styleElement.textContent = modalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [roomId]);

  return (
    <div className="youtube-simulcast">
      <style>{`
        .youtube-simulcast {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .youtube-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .youtube-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .status-configured {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          color: #0369a1;
        }
        
        .status-not-configured {
          background: #fef2f2;
          border: 1px solid #ef4444;
          color: #dc2626;
        }
        
        .status-ready {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .simulcast-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .simulcast-active {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .simulcast-inactive {
          background: #f9fafb;
          border: 1px solid #d1d5db;
          color: #6b7280;
        }
        
        .youtube-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .youtube-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .youtube-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .youtube-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .youtube-btn.primary {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }
        
        .youtube-btn.primary:hover {
          background: #b91c1c;
        }
        
        .youtube-btn.success {
          background: #22c55e;
          color: white;
          border-color: #22c55e;
        }
        
        .youtube-btn.success:hover {
          background: #16a34a;
        }
        
        .message {
          padding: 12px;
          border-radius: 6px;
          margin: 16px 0;
          font-size: 14px;
        }
        
        .message.success {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .message.error {
          background: #fef2f2;
          border: 1px solid #ef4444;
          color: #dc2626;
        }
        
        .message.info {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          color: #0369a1;
        }
        
        .auth-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .auth-modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          text-align: center;
        }
        
        .auth-modal h3 {
          margin: 0 0 16px 0;
          color: #111827;
        }
        
        .auth-modal p {
          margin: 0 0 24px 0;
          color: #6b7280;
        }
        
        .auth-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .auth-modal-btn {
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .auth-modal-btn.primary {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }
        
        .auth-modal-btn:hover {
          background: #f9fafb;
        }
        
        .auth-modal-btn.primary:hover {
          background: #b91c1c;
        }
      `}</style>

      <div className="youtube-header">
        <FaYoutube style={{ color: '#dc2626', fontSize: '20px' }} />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>YouTube Simulcast</h3>
      </div>

      {/* Stream Key Status */}
      <div className={`youtube-status ${
        streamKeyStatus.isReady ? 'status-ready' : 
        streamKeyStatus.isConfigured ? 'status-configured' : 
        'status-not-configured'
      }`}>
        {streamKeyStatus.isReady ? (
          <>
            <FaCheck />
            Stream Key configured - Ready to stream
          </>
        ) : streamKeyStatus.isConfigured ? (
          <>
            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
            Stream Key required - Enter your YouTube stream key
          </>
        ) : (
          <>
            <FaTimes />
            Stream Key not configured
          </>
        )}
      </div>

      {/* Dual Streaming Status */}
      <div className={`simulcast-status ${
        simulcastStatus.isActive ? 'simulcast-active' : 'simulcast-inactive'
      }`}>
        {simulcastStatus.isActive ? (
          <>
            <FaCheck />
            Dual Stream Active - Browser + YouTube
            {simulcastStatus.broadcastUrl && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                YouTube: {simulcastStatus.broadcastUrl}
              </div>
            )}
          </>
        ) : (
          <>
            <FaTimes />
            {isStreaming ? 'Browser Only (YouTube inactive)' : 'YouTube Stream Inactive'}
          </>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="youtube-actions">
        {!streamKeyStatus.isReady ? (
          <>
            <button
              className="youtube-btn primary"
              onClick={() => setShowStreamKeyInput(true)}
            >
              <FaYoutube />
              Enter Stream Key
            </button>
            <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
              Enter your YouTube stream key to start simulcast (like OBS)
            </div>
          </>
        ) : simulcastStatus.isActive ? (
          <>
            <button
              className="youtube-btn success"
              onClick={stopSimulcast}
              disabled={isStopping}
            >
              {isStopping ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaStop />}
              Stop Simulcast
            </button>
            
            {simulcastStatus.broadcastUrl && (
              <button
                className="youtube-btn"
                onClick={() => window.open(simulcastStatus.broadcastUrl, '_blank')}
              >
                <FaExternalLinkAlt />
                View on YouTube
              </button>
            )}
          </>
         ) : (
           <>
             <button
               className="youtube-btn primary"
               onClick={startSimulcast}
               disabled={isStarting}
             >
               {isStarting ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPlay />}
               {isStarting ? 'Starting Dual Stream...' : 'Start Dual Stream (Browser + YouTube)'}
             </button>
             <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
               {isStreaming ? 'Browser stream active - will connect to MediaSoup stream' : 'Will create YouTube stream independently'}
             </div>
             <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
               Attempting to stream real video from MediaSoup to YouTube
             </div>
           </>
         )}

         {/* DEBUG TOOLS - Always visible regardless of simulcast status */}
         <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
           <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#495057' }}>🔧 Debug Tools</h4>
           
           {/* First row of debug buttons */}
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
             <button
               className="youtube-btn secondary"
               onClick={async () => {
                 try {
                   const response = await fetch(`${API_URL}/api/youtube/simulcast/ffmpeg-status/${roomId}`);
                   const data = await response.json();
                   console.log('FFmpeg Status:', data);
                   showMessage(`FFmpeg Status: ${data.data?.isRunning ? 'Running' : 'Not Running'} (PID: ${data.data?.pid || 'N/A'})`, 'info');
                 } catch (error) {
                   console.error('Error checking FFmpeg status:', error);
                   showMessage('Error checking FFmpeg status', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px' }}
               disabled={false}
             >
               Check FFmpeg Status
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={async () => {
                 try {
                   const response = await fetch(`${API_URL}/api/youtube/simulcast/all`);
                   const data = await response.json();
                   console.log('All Active Simulcasts:', data);
                   showMessage(`Active Simulcasts: ${Object.keys(data.data || {}).length}`, 'info');
                 } catch (error) {
                   console.error('Error checking all simulcasts:', error);
                   showMessage('Error checking simulcasts', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px' }}
               disabled={false}
             >
               Check All Simulcasts
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={async () => {
                 try {
                   // Stop current simulcast
                   await fetch(`${API_URL}/api/youtube/simulcast/stop`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ roomId })
                   });
                   
                   // Wait a moment
                   await new Promise(resolve => setTimeout(resolve, 2000));
                   
                   // Start simulcast again
                   await startSimulcast();
                   
                   showMessage('Simulcast restarted', 'success');
                 } catch (error) {
                   console.error('Error restarting simulcast:', error);
                   showMessage('Error restarting simulcast', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px' }}
               disabled={isStarting}
             >
               Restart Simulcast
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={async () => {
                 try {
                   showMessage('Testing FFmpeg...', 'info');
                   
                   // Test FFmpeg with a simple command
                   const response = await fetch(`${API_URL}/api/youtube/test-ffmpeg`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' }
                   });
                   
                   const data = await response.json();
                   console.log('FFmpeg Test Result:', data);
                   showMessage(`FFmpeg Test: ${data.success ? 'PASSED' : 'FAILED'}`, data.success ? 'success' : 'error');
                 } catch (error) {
                   console.error('Error testing FFmpeg:', error);
                   showMessage('Error testing FFmpeg', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px' }}
               disabled={false}
             >
               Test FFmpeg
             </button>
           </div>
           
           {/* Second row of debug buttons */}
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
             <button
               className="youtube-btn primary"
               onClick={async () => {
                 try {
                   setIsStarting(true);
                   showMessage('Starting REAL VIDEO stream to YouTube...', 'info');
                   
                   // Stop current simulcast first
                   await fetch(`${API_URL}/api/youtube/simulcast/stop`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ roomId })
                   });
                   
                   // Wait a moment
                   await new Promise(resolve => setTimeout(resolve, 2000));
                   
                   // Start simulcast with real video
                   await startSimulcast();
                   
                   showMessage('REAL VIDEO stream started! Check YouTube!', 'success');
                 } catch (error) {
                   console.error('Error starting real video stream:', error);
                   showMessage('Error starting real video stream', 'error');
                 } finally {
                   setIsStarting(false);
                 }
               }}
               style={{ fontSize: '12px', padding: '8px', backgroundColor: '#ff6b6b' }}
               disabled={isStarting}
             >
               🎥 START REAL VIDEO STREAM
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={async () => {
                 try {
                   const currentStreamKey = getStreamKey();
                   if (!currentStreamKey) {
                     showMessage('Please enter stream key first', 'error');
                     setShowStreamKeyInput(true);
                     return;
                   }
                   
                   showMessage('Testing RTMP connection with stream key...', 'info');
                   
                   // Test RTMP connection with stream key
                   const response = await fetch(`${API_URL}/api/youtube/test-rtmp-stream-key`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ roomId, streamKey: currentStreamKey })
                   });
                   
                   const data = await response.json();
                   console.log('RTMP Stream Key Test Result:', data);
                   
                   if (data.success) {
                     showMessage(`RTMP Test: SUCCESS! FFmpeg working with stream key`, 'success');
                   } else {
                     showMessage(`RTMP Test: FAILED - ${data.message}`, 'error');
                   }
                 } catch (error) {
                   console.error('Error testing RTMP:', error);
                   showMessage('Error testing RTMP connection', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px', backgroundColor: '#4ecdc4' }}
               disabled={false}
             >
               🔗 TEST RTMP WITH STREAM KEY
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={() => {
                 resetStreamKey();
               }}
               style={{ fontSize: '12px', padding: '8px' }}
             >
               Reset Stream Key
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={() => {
                 window.open('https://studio.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw/settings/channel', '_blank');
                 showMessage('Opening YouTube Studio. Go to Settings > Channel > Feature eligibility > Live streaming', 'info');
               }}
               style={{ fontSize: '12px', padding: '8px' }}
             >
               Enable Live Streaming
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={() => {
                 if (simulcastStatus.broadcastUrl) {
                   window.open(simulcastStatus.broadcastUrl, '_blank');
                   showMessage('Opening YouTube video. Change privacy to Public or Unlisted to share.', 'info');
                 } else {
                   showMessage('No YouTube video available yet. Start simulcast first.', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px' }}
             >
               Change Privacy
             </button>
           </div>
         </div>
      </div>

      {/* Stream Key Input Modal */}
      {showStreamKeyInput && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Enter YouTube Stream Key</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowStreamKeyInput(false);
                  setStreamKey('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Enter your YouTube stream key to start simulcast (like OBS):</p>
              <div className="input-group">
                <label htmlFor="streamKey">Stream Key:</label>
                <input
                  id="streamKey"
                  type="text"
                  placeholder="Enter your YouTube stream key (e.g., 81ue-2scr-37ee-43zj-age7)"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '8px',
                    fontFamily: 'monospace'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      if (streamKey.trim()) {
                        saveStreamKey(streamKey.trim());
                        setShowStreamKeyInput(false);
                        showMessage('Stream key saved successfully!', 'success');
                      }
                    }
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                You can find your stream key in YouTube Studio → Go Live → Stream
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="youtube-btn"
                onClick={() => {
                  if (streamKey.trim()) {
                    saveStreamKey(streamKey.trim());
                    setShowStreamKeyInput(false);
                    showMessage('Stream key saved successfully!', 'success');
                  } else {
                    showMessage('Please enter a valid stream key', 'error');
                  }
                }}
                disabled={!streamKey.trim()}
              >
                Save Stream Key
              </button>
              <button
                className="youtube-btn secondary"
                onClick={() => {
                  setShowStreamKeyInput(false);
                  setStreamKey('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default YouTubeSimulcast;
