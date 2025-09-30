import React, { useState, useEffect, useRef } from 'react';
import CameraPreview from './CameraPreview';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

interface CameraStream {
  deviceId: string;
  stream: MediaStream;
  label: string;
}

const AdminCameraPreviewPage: React.FC = () => {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [activeStreams, setActiveStreams] = useState<CameraStream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);

  // Get available camera devices
  const getAvailableCameras = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setAvailableCameras(videoDevices);
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start camera stream
  const startCameraStream = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });

      const device = availableCameras.find(cam => cam.deviceId === deviceId);
      const label = device?.label || `Kamera ${deviceId.slice(0, 8)}`;

      setActiveStreams(prev => [...prev, { deviceId, stream, label }]);
    } catch (err) {
      console.error('Error starting camera stream:', err);
      setError(`Gagal memulai kamera: ${err}`);
    }
  };

  // Stop camera stream
  const stopCameraStream = (deviceId: string) => {
    const streamData = activeStreams.find(s => s.deviceId === deviceId);
    if (streamData) {
      streamData.stream.getTracks().forEach(track => track.stop());
      setActiveStreams(prev => prev.filter(s => s.deviceId !== deviceId));
    }
  };


  // Toggle camera selection and start/stop stream
  const toggleCameraSelection = async (deviceId: string) => {
    if (activeStreams.find(s => s.deviceId === deviceId)) {
      // If camera is active, stop it
      stopCameraStream(deviceId);
    } else {
      // If camera is not active, start it
      await startCameraStream(deviceId);
    }
  };

  // Toggle fullscreen for specific camera
  const toggleFullscreen = (deviceId: string) => {
    setIsFullscreen(isFullscreen === deviceId ? null : deviceId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeStreams.forEach(streamData => {
        streamData.stream.getTracks().forEach(track => track.stop());
      });
    };
  }, []);

  // Load cameras on component mount
  useEffect(() => {
    getAvailableCameras();
  }, []);

  return (
    <div style={{
      padding: '24px',
      background: '#f6f8fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 24px rgba(187,247,208,0.12)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}>
              Preview Kamera
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              margin: '0'
            }}>
              Lihat dan kelola kamera yang tersambung ke device
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={getAvailableCameras}
              disabled={isLoading}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isLoading ? (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4zM4 4l16 16"/>
                </svg>
              )}
              Refresh Kamera
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '20px',
              color: '#ef4444'
            }}>
              ⚠️
            </div>
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {error}
            </div>
          </div>
        )}

        {/* Camera List */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e293b',
            margin: '0 0 16px 0'
          }}>
            Kamera Tersedia ({availableCameras.length})
          </h3>
          
          {availableCameras.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📹</div>
              <p style={{ margin: '0', fontSize: '14px' }}>
                {isLoading ? 'Mencari kamera...' : 'Tidak ada kamera yang ditemukan'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {availableCameras.map((camera) => {
                const isActive = activeStreams.find(s => s.deviceId === camera.deviceId);
                
                return (
                  <div
                    key={camera.deviceId}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `2px solid ${isActive ? '#10b981' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onClick={() => toggleCameraSelection(camera.deviceId)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = isActive ? '#059669' : '#cbd5e1';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = isActive ? '#10b981' : '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: isActive ? '#10b981' : '#f1f5f9',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? 'white' : '#64748b'
                      }}>
                        📹
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '4px'
                        }}>
                          {camera.label || `Kamera ${camera.deviceId.slice(0, 8)}`}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#64748b'
                        }}>
                          ID: {camera.deviceId.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      <span style={{
                        background: isActive ? '#dcfce7' : '#f1f5f9',
                        color: isActive ? '#166534' : '#64748b',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        {isActive ? 'Aktif' : 'Klik untuk mulai'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Camera Previews */}
      {activeStreams.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(187,247,208,0.12)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            margin: '0 0 20px 0'
          }}>
            Preview Kamera ({activeStreams.length})
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isFullscreen ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {activeStreams.map((streamData) => (
              <div
                key={streamData.deviceId}
                style={{
                  position: 'relative',
                  background: '#000',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '2px solid #e5e7eb'
                }}
              >
                <CameraPreview
                  stream={streamData.stream}
                  streamTitle={streamData.label}
                  fullScreen={isFullscreen === streamData.deviceId}
                />
                
                {/* Camera Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {streamData.label}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleFullscreen(streamData.deviceId)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      {isFullscreen === streamData.deviceId ? '⤓' : '⤢'}
                    </button>
                    
                    <button
                      onClick={() => stopCameraStream(streamData.deviceId)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminCameraPreviewPage;
