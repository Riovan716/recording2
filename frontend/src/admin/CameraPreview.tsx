import React, { useRef, useEffect, useState } from 'react';

interface CameraPreviewProps {
  stream: MediaStream;
  isStreaming?: boolean;
  streamTitle?: string;
  viewerCount?: number;
  fullScreen?: boolean;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ 
  stream, 
  isStreaming = false, 
  streamTitle = "Live Stream",
  viewerCount = 0,
  fullScreen = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Handle loading states
      const video = videoRef.current;
      
      const handleLoadStart = () => {
        setIsLoading(true);
        setHasError(false);
      };
      
      const handleLoadedData = () => {
        setIsLoading(false);
        setHasError(false);
      };
      
      const handleError = () => {
        setIsLoading(false);
        setHasError(true);
      };
      
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
      };
    }
  }, [stream]);

  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'relative',
      borderRadius: fullScreen ? '0' : '16px',
      overflow: 'hidden',
      boxShadow: fullScreen ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.12)',
      backgroundColor: '#000',
      border: fullScreen ? 'none' : '2px solid #e5e7eb',
      transition: 'all 0.3s ease',
      aspectRatio: fullScreen ? 'auto' : '16/9',
      minHeight: fullScreen ? '100vh' : '200px',
      maxHeight: fullScreen ? '100vh' : (window.innerWidth < 768 ? '250px' : '400px'),
      width: fullScreen ? '100vw' : '100%',
      height: fullScreen ? '100vh' : 'auto',
      top: fullScreen ? '0' : 'auto',
      left: fullScreen ? '0' : 'auto',
      zIndex: fullScreen ? 9999 : 'auto'
    }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          borderRadius: fullScreen ? '0' : '14px'
        }}
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f4f6',
            borderTop: '3px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            color: '#f3f4f6',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Memuat kamera...
          </div>
        </div>
      )}
      
      {/* Error Overlay */}
      {hasError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '32px',
            color: '#ef4444'
          }}>
            📹
          </div>
          <div style={{
            color: '#f3f4f6',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Gagal memuat kamera
          </div>
        </div>
      )}
      
      {/* Live Indicator */}
      {isStreaming && !isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'white',
            animation: 'blink 1s infinite'
          }} />
          LIVE
        </div>
      )}
      
      {/* Stream Title */}
      {streamTitle && !isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {streamTitle}
        </div>
      )}
      
      {/* Viewer Count */}
      {isStreaming && viewerCount > 0 && !isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          👥 {viewerCount} penonton
        </div>
      )}
      
      {/* Quality Indicator */}
      {isStreaming && !isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          📡 HD
        </div>
      )}
      
      {/* Full Screen Toggle Button */}
      {!isLoading && !hasError && (
        <button
          onClick={() => window.location.reload()} // Simple way to exit fullscreen
          style={{
            position: 'absolute',
            top: '12px',
            right: fullScreen ? '12px' : '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={fullScreen ? 'Keluar dari Full Screen' : 'Masuk ke Full Screen'}
        >
          {fullScreen ? '⤓' : '⤢'}
        </button>
      )}
      
      {/* Add CSS animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
};

export default CameraPreview;
