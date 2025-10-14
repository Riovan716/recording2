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

interface YouTubeStatus {
  isConfigured: boolean;
  hasTokens: boolean;
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
  const [status, setStatus] = useState<YouTubeStatus>({
    isConfigured: false,
    hasTokens: false,
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  // Removed rate limiting state - not needed

  const API_URL = 'http://192.168.1.21:3000';

  // Helper function to get YouTube tokens from localStorage
  const getYouTubeTokens = () => {
    try {
      const tokens = localStorage.getItem('youtubeTokens');
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error parsing YouTube tokens:', error);
      return null;
    }
  };

  // Helper function to create headers with YouTube tokens
  const createHeaders = (includeTokens = true) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (includeTokens) {
      const tokens = getYouTubeTokens();
      if (tokens) {
        headers['Authorization'] = `Bearer ${JSON.stringify(tokens)}`;
      }
    }
    
    return headers;
  };

  // Reset YouTube authentication for new live stream
  const resetYouTubeAuth = () => {
    localStorage.removeItem('youtubeTokens');
    localStorage.removeItem('youtubeAuthSuccess');
    localStorage.removeItem('youtubeAuthInProgress');
    console.log('YouTube authentication reset for new live stream');
    showMessage('YouTube authentication reset - please authenticate again', 'info');
  };

  // Removed rate limit reset - not needed

  // Check if this is a new live stream and reset auth if needed
  const checkForNewLiveStream = () => {
    const lastRoomId = localStorage.getItem('lastYouTubeRoomId');
    if (lastRoomId !== roomId) {
      console.log('New live stream detected, resetting YouTube authentication');
      resetYouTubeAuth();
      localStorage.setItem('lastYouTubeRoomId', roomId);
    }
  };

  // Check YouTube integration status
  const checkStatus = async () => {
    try {
      // Check if we just returned from OAuth authentication
      const authInProgress = localStorage.getItem('youtubeAuthInProgress');
      const storedTokens = localStorage.getItem('youtubeTokens');
      const authSuccess = localStorage.getItem('youtubeAuthSuccess');
      
      if (authInProgress === 'true') {
        console.log('Returned from YouTube OAuth authentication');
        localStorage.removeItem('youtubeAuthInProgress');
        
        // Wait a bit for tokens to be available
        setTimeout(() => {
          checkStatus();
        }, 1000);
        return;
      }
      
      if (storedTokens && authSuccess) {
        console.log('Found YouTube tokens in localStorage');
        localStorage.removeItem('youtubeAuthSuccess');
        
        // Send tokens to backend to store in session
        try {
          const response = await fetch(`${API_URL}/api/youtube/auth/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session
            body: JSON.stringify({ tokens: JSON.parse(storedTokens) })
          });
          
          if (response.ok) {
            console.log('YouTube tokens stored in backend successfully');
            showMessage('YouTube authentication successful!', 'success');
          }
        } catch (error) {
          console.error('Error storing tokens in backend:', error);
        }
      }
      
      const response = await fetch(`${API_URL}/api/youtube/status`, {
        method: 'GET',
        headers: createHeaders(true), // Include YouTube tokens in header
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
        console.log('YouTube status:', data);
      } else {
        console.log('YouTube API not configured:', data.message);
        setStatus({
          isConfigured: false,
          hasTokens: false,
          isReady: false
        });
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
      setStatus({
        isConfigured: false,
        hasTokens: false,
        isReady: false
      });
    }
  };

  // Check simulcast status
  const checkSimulcastStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/youtube/simulcast/status/${roomId}`, {
      });
      const data = await response.json();
      
      if (data.success) {
        setSimulcastStatus(data.data);
      }
    } catch (error) {
      console.error('Error checking simulcast status:', error);
    }
  };

  // Get YouTube authorization URL (Desktop flow)
  const getAuthUrl = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/youtube/auth/url`, {
      });
      const data = await response.json();
      
      if (data.success) {
        // For Desktop OAuth flow, open in external browser
        console.log('Opening Google OAuth in external browser:', data.authUrl);
        
        // Show instructions for manual code input
        setShowAuthModal(true);
        setAuthUrl(data.authUrl);
        
        // Try to open in external browser
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(data.authUrl);
        } else {
          // Fallback: open in new tab
          window.open(data.authUrl, '_blank');
        }
        
        // Reset loading state after opening modal
        setIsLoading(false);
        
      } else {
        showMessage(data.error || 'Failed to get YouTube authorization URL', 'error');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      showMessage('Failed to get YouTube authorization URL', 'error');
      setIsLoading(false);
    }
  };

  // Handle manual code input (Desktop flow)
  const handleManualCode = async (code: string) => {
    try {
      console.log('[Frontend] Starting manual code submission:', code);
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/youtube/auth/manual-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ code }),
      });
      
      console.log('[Frontend] Response status:', response.status);
      console.log('[Frontend] Response headers:', response.headers);
      
      const data = await response.json();
      console.log('[Frontend] Response data:', data);
      
      if (data.success) {
        console.log('[Frontend] Authentication successful');
        
        // Store tokens in localStorage
        if (data.tokens) {
          localStorage.setItem('youtubeTokens', JSON.stringify(data.tokens));
          localStorage.setItem('youtubeAuthSuccess', 'true');
          console.log('[Frontend] YouTube tokens stored in localStorage');
        }
        
        showMessage('YouTube authentication successful!', 'success');
        setShowAuthModal(false);
        setAuthUrl('');
        await checkStatus();
        setIsLoading(false); // Ensure loading is reset after successful authentication
      } else {
        console.log('[Frontend] Authentication failed:', data.error);
        showMessage(data.error || 'Failed to authenticate with YouTube', 'error');
      }
    } catch (error) {
      console.error('[Frontend] Error submitting manual code:', error);
      showMessage('Failed to authenticate with YouTube', 'error');
    } finally {
      console.log('[Frontend] Setting loading to false');
      setIsLoading(false);
    }
  };

  // Removed rate limiting helper - not needed

  // Start simulcast
  const startSimulcast = async () => {
    if (!status.isReady) {
      showMessage('YouTube authentication required', 'error');
      return;
    }

    // Removed rate limiting checks - not needed

    try {
      setIsStarting(true);
      
      const headers = createHeaders(true); // Include YouTube tokens
      
      const response = await fetch(`${API_URL}/api/youtube/simulcast/start`, {
        method: 'POST',
        headers: headers,
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          roomId: roomId,
          title: streamTitle,
          description: `Live stream: ${streamTitle}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage(`Simulcast started! YouTube URL: ${data.data.broadcastUrl}`, 'success');
        setSimulcastStatus({
          isActive: true,
          streamId: data.data.streamId,
          broadcastId: data.data.broadcastId,
          broadcastUrl: data.data.broadcastUrl,
          rtmpUrl: data.data.rtmpUrl
        });
        if (onSimulcastStart) {
          onSimulcastStart(data.data.broadcastUrl);
        }
      } else {
        console.error('Simulcast error:', data);
        let errorMessage = data.error || 'Failed to start simulcast';
        
        // Handle specific YouTube API errors
        if (data.details === 'Invalid Credentials') {
          errorMessage = 'YouTube token expired. Please authenticate again.';
          // Reset authentication
          resetYouTubeAuth();
        } else if (data.details && data.details.includes('rate limit')) {
          errorMessage = 'YouTube API temporarily unavailable. Please try again.';
        } else if (data.details && data.details.includes('not enabled for live streaming')) {
          errorMessage = 'YouTube Live Streaming not enabled. Please enable it in YouTube Studio: Settings > Channel > Feature eligibility > Live streaming.';
        } else if (data.details && data.details.includes('Resolution is required')) {
          errorMessage = 'YouTube requires stream resolution. Please check your video settings and try again.';
        } else if (data.details && data.details.includes('quota')) {
          errorMessage = 'YouTube API quota exceeded. Please try again later.';
        } else if (data.details && data.details.includes('permission')) {
          errorMessage = 'YouTube API permission denied. Please check your account.';
        } else if (data.details && data.details.includes('verification')) {
          errorMessage = 'YouTube account needs verification. Please verify your account first.';
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
      
      const headers = createHeaders(true); // Include YouTube tokens
      
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

  // Handle OAuth callback
  const handleOAuthCallback = async (code: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/youtube/auth/callback?code=${code}`, {
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('YouTube authentication successful!', 'success');
        setShowAuthModal(false);
        checkStatus(); // Refresh status
      } else {
        showMessage(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      showMessage('Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if this is a new live stream and reset auth if needed
    checkForNewLiveStream();
    
    checkStatus();
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

      {/* Status */}
      <div className={`youtube-status ${
        status.isReady ? 'status-ready' : 
        status.isConfigured ? 'status-configured' : 
        'status-not-configured'
      }`}>
        {status.isReady ? (
          <>
            <FaCheck />
            YouTube integration ready
          </>
        ) : status.isConfigured ? (
          <>
            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
            YouTube API configured, authentication required
          </>
        ) : (
          <>
            <FaTimes />
            YouTube API not configured
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
        {!status.isConfigured ? (
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            Configure YouTube API credentials in environment variables
          </div>
        ) : !status.isReady ? (
          <>
            <button
              className="youtube-btn primary"
              onClick={getAuthUrl}
              disabled={isLoading}
            >
              {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaYoutube />}
              {isLoading ? 'Redirecting to Google...' : 'Authenticate with YouTube'}
            </button>
            {isLoading && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                You will be redirected to Google for authentication...
              </div>
            )}
            <button
              className="youtube-btn secondary"
              onClick={() => {
                const testPopup = window.open(
                  `${API_URL}/api/youtube/auth/test`,
                  'test-callback',
                  'width=400,height=300,scrollbars=yes,resizable=yes'
                );
                if (!testPopup) {
                  showMessage('Popup blocked. Please allow popups for this site.', 'error');
                }
              }}
              style={{ marginTop: '8px', fontSize: '12px', padding: '8px' }}
            >
              Test Callback (Debug)
            </button>
            <button
              className="youtube-btn secondary"
              onClick={() => {
                setIsLoading(false);
                showMessage('Loading state reset', 'info');
              }}
              style={{ marginTop: '8px', fontSize: '12px', padding: '8px' }}
            >
              Reset Loading
            </button>
             <button
               className="youtube-btn secondary"
               onClick={() => {
                 resetYouTubeAuth();
                 checkStatus(); // Refresh status after reset
               }}
               style={{ marginTop: '8px', fontSize: '12px', padding: '8px' }}
             >
               Reset Auth
             </button>
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
                   showMessage('Testing RTMP connection to YouTube...', 'info');
                   
                   // Test RTMP connection
                   const response = await fetch(`${API_URL}/api/youtube/test-rtmp`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ roomId })
                   });
                   
                   const data = await response.json();
                   console.log('RTMP Test Result:', data);
                   showMessage(`RTMP Test: ${data.success ? 'CONNECTED' : 'FAILED'}`, data.success ? 'success' : 'error');
                 } catch (error) {
                   console.error('Error testing RTMP:', error);
                   showMessage('Error testing RTMP connection', 'error');
                 }
               }}
               style={{ fontSize: '12px', padding: '8px', backgroundColor: '#4ecdc4' }}
               disabled={false}
             >
               🔗 TEST RTMP CONNECTION
             </button>
             
             <button
               className="youtube-btn secondary"
               onClick={() => {
                 resetYouTubeAuth();
                 checkStatus(); // Refresh status after reset
               }}
               style={{ fontSize: '12px', padding: '8px' }}
             >
               Reset Auth
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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal">
          <div className="auth-modal-content">
            <h3>YouTube Authentication</h3>
            <p>
              Click the button below to authenticate with YouTube. 
              You will be redirected to YouTube to grant permissions.
            </p>
            <div className="auth-modal-buttons">
              <button
                className="auth-modal-btn"
                onClick={() => setShowAuthModal(false)}
              >
                Cancel
              </button>
              <button
                className="auth-modal-btn primary"
                onClick={() => window.open(authUrl, '_blank')}
              >
                <FaYoutube style={{ marginRight: '8px' }} />
                Authenticate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Code Input Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>YouTube Authentication</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthUrl('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Please follow these steps:</p>
              <ol>
                <li>Click the button below to open Google OAuth in your browser</li>
                <li>Complete the authentication process</li>
                <li>Copy the authorization code from the browser</li>
                <li>Paste it in the field below</li>
              </ol>
              
              <button
                className="youtube-btn primary"
                onClick={() => {
                  if ((window as any).electronAPI?.openExternal) {
                    (window as any).electronAPI.openExternal(authUrl);
                  } else {
                    window.open(authUrl, '_blank');
                  }
                }}
                style={{ marginBottom: '16px' }}
              >
                <FaExternalLinkAlt />
                Open Google OAuth
              </button>
              
              <div className="input-group">
                <label htmlFor="authCode">Authorization Code:</label>
                <input
                  id="authCode"
                  type="text"
                  placeholder="Paste authorization code here..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const code = (e.target as HTMLInputElement).value.trim();
                      if (code) {
                        handleManualCode(code);
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="youtube-btn"
                onClick={() => {
                  const input = document.getElementById('authCode') as HTMLInputElement;
                  const code = input.value.trim();
                  if (code) {
                    handleManualCode(code);
                  } else {
                    showMessage('Please enter the authorization code', 'error');
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Code'}
              </button>
              <button
                className="youtube-btn secondary"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthUrl('');
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
