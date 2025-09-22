import React, { useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStreaming } from '../context/StreamingContext';
import { FaVideo, FaUpload, FaStop, FaDownload, FaUser, FaBook, FaCamera, FaTimes } from 'react-icons/fa';
import ModalNotifikasi from '../components/ModalNotifikasi';
import MultiCameraRecorder from '../components/MultiCameraRecorder';
import BasicLayoutEditor from '../components/BasicLayoutEditor';
import { API_URL } from '../config';

// Color palette konsisten dengan AdminPanel
const VIBRANT_BLUE = '#2563EB';
const SOFT_BLUE = '#DBEAFE';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const CARD_RADIUS = 18;
const SHADOW = '0 4px 24px rgba(37,99,235,0.08)';
const FONT_FAMILY = 'Poppins, Inter, Segoe UI, Arial, sans-serif';

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: VIBRANT_BLUE,
  primaryDark: '#1E40AF',
  accent: '#ef4444',
  accentDark: '#dc2626',
  text: '#1e293b',
  subtext: GRAY_TEXT,
  border: '#e5e7eb',
  bg: LIGHT_GRAY,
  white: WHITE,
  green: '#22c55e',
  greenDark: '#16a34a',
  red: '#ef4444',
  redDark: '#dc2626',
  yellow: '#facc15',
  yellowDark: '#eab308',
  badge: ['#dbeafe', '#fce7f3', '#fef3c7', '#d1fae5', '#fee2e2', '#f3e8ff'],
};

// Animated dot for recording status
const AnimatedDot = () => (
  <span style={{
    display: 'inline-block',
    width: 8, height: 8, borderRadius: '50%',
    background: COLORS.accent,
    marginRight: 6,
    animation: 'blink 1s infinite',
    verticalAlign: 'middle',
  }} />
);

// Keyframes for blink and pulse
const styleSheet = document.createElement('style');
styleSheet.innerHTML = `
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
`;
document.head.appendChild(styleSheet);

// Popup Modal
const PopupModal: React.FC<{ open: boolean; onClose: () => void; message: string }> = ({ open, onClose, message }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: COLORS.white, borderRadius: CARD_RADIUS, boxShadow: SHADOW, padding: '24px', minWidth: 300, maxWidth: '90vw', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: COLORS.accent, marginBottom: 8 }}>Peringatan</div>
        <div style={{ color: COLORS.text, fontSize: 14, marginBottom: 16 }}>{message}</div>
        <button onClick={onClose} style={{ background: COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 6, fontWeight: 500, fontSize: 14, padding: '8px 20px', cursor: 'pointer' }}>OK</button>
      </div>
    </div>
  );
};

// Badge for mata pelajaran
const MapelBadge: React.FC<{ mapel: string; idx: number }> = ({ mapel, idx }) => (
  <span style={{
    background: COLORS.badge[idx % COLORS.badge.length],
    color: COLORS.primaryDark,
    fontWeight: 600,
    fontSize: 11,
    borderRadius: 6,
    padding: '2px 8px',
    marginRight: 4,
    display: 'inline-block',
  }}>{mapel}</span>
);

// Stat Card Component
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div style={{
    background: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: CARD_RADIUS,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: SHADOW,
  }}>
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 8,
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.white,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '12px', color: COLORS.subtext, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.text }}>{value}</div>
    </div>
  </div>
);

const AdminRecordingPage: React.FC = () => {
  const { user, token } = useAuth();
  const { streamingState, startCameraRecording, startScreenRecording, stopRecording, uploadRecording, cancelUpload, setSelectedKelas, setSelectedMapel, startMultiCameraRecording, updateRecordingLayout } = useStreaming();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showJudulModal, setShowJudulModal] = useState(false);
  const [recordingJudul, setRecordingJudul] = useState('');
  const [pendingRecordingType, setPendingRecordingType] = useState<'camera' | 'screen' | 'multi-camera' | null>(null);
  const [showMultiCameraRecorder, setShowMultiCameraRecorder] = useState(false);
  const [multiCameraStatus, setMultiCameraStatus] = useState('');
  const [showRecordingLayoutEditor, setShowRecordingLayoutEditor] = useState(false);
  const [recordingLayouts, setRecordingLayouts] = useState<any[]>([]);
  const [recordingCameras, setRecordingCameras] = useState<any[]>([]);
  const [recordingScreenSource, setRecordingScreenSource] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 900;

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/recording`);
      if (res.ok) {
        const data = await res.json();
        setRecordings(data);
      }
    } catch (err) {
      // Handle error silently
    }
  };


  React.useEffect(() => {
    fetchRecordings();
  }, []);

  // Reset recording state when recording stops
  React.useEffect(() => {
    if (!streamingState.isRecording && !streamingState.isScreenRecording) {
      setRecordingCameras([]);
      setRecordingScreenSource(null);
      setRecordingLayouts([]);
    }
  }, [streamingState.isRecording, streamingState.isScreenRecording]);


  const handleStartCameraRecording = () => {
    setPendingRecordingType('camera');
    setShowJudulModal(true);
  };


  const handleStartMultiCameraRecording = () => {
    setPendingRecordingType('multi-camera');
    setShowMultiCameraRecorder(true);
  };

  const handleConfirmRecording = async () => {
    if (!recordingJudul.trim()) {
      alert('Judul recording harus diisi!');
      return;
    }

    try {
      if (pendingRecordingType === 'camera') {
        await startCameraRecording("admin", recordingJudul);
      }
      setShowJudulModal(false);
      setRecordingJudul('');
      setPendingRecordingType(null);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleUpload = async () => {
    try {
      await uploadRecording();
      fetchRecordings();
    } catch (err) {
      // Handle error silently
    }
  };


  const showConfirmDialog = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelUpload = () => {
    showConfirmDialog(
      'Apakah Anda yakin ingin membatalkan upload video ini? Video yang sudah direkam akan dihapus.',
      () => {
        cancelUpload();
      }
    );
  };

  const handleMultiCameraStartRecording = async (selectedCameras: string[], layoutType: string, judul: string, customLayout?: any[], cameras?: any[], screenSource?: any) => {
    try {
      // Store the cameras being used for recording
      if (cameras) {
        setRecordingCameras(cameras);
      }
      
      // Store the screen source being used for recording
      if (screenSource) {
        setRecordingScreenSource(screenSource);
      }
      
      // Start multi-camera recording with canvas composition
      await startMultiCameraRecording(selectedCameras, layoutType, judul, customLayout, screenSource);
      setShowMultiCameraRecorder(false);
      setPendingRecordingType(null);
    } catch (error) {
      console.error('Error starting multi-camera recording:', error);
    }
  };

  const handleMultiCameraStatusUpdate = useCallback((status: string) => {
    setMultiCameraStatus(status);
  }, []);

  const handleRecordingLayoutChange = useCallback((layouts: any[]) => {
    setRecordingLayouts(layouts);
    updateRecordingLayout(layouts);
  }, [updateRecordingLayout]);



  return (
    <>
      {/* Add CSS animations */}
      <style>
        {`
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
      
      <div style={{ 
        padding: '32px 32px 32px 32px', 
        background: COLORS.bg, 
        fontFamily: FONT_FAMILY,
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        {/* Welcome Card */}
        <div style={{
          background: VIBRANT_BLUE,
          borderRadius: CARD_RADIUS,
          color: WHITE,
          padding: isMobile ? '18px 12px' : '32px 40px',
          marginBottom: 32,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: SHADOW,
          minHeight: 120,
        }}>
          <div>
            <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 8 }}>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Video Recording</div>
            <div style={{ fontSize: 16, opacity: 0.9 }}>
              Selamat datang, {user?.name || 'Admin'}! Buat dan kelola video pembelajaran Anda dengan mudah.
            </div>
          </div>
          <span style={{ height: 100, fontSize: 100, objectFit: 'contain', marginLeft: isMobile ? 0 : 32, marginTop: isMobile ? 18 : 0, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 4px 24px #0002)' }}>🎥</span>
        </div>

        {/* Recording Controls */}
        <div style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: CARD_RADIUS,
          padding: '20px',
          boxShadow: SHADOW,
          width: '100%',
          marginBottom: '24px',
        }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.text, margin: '0 0 16px 0' }}>
              Buat Video Recording
            </h2>
            
            

            {/* Recording Buttons */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginBottom: '16px' }}>
              {!(streamingState.isRecording || streamingState.isScreenRecording) ? (
                <>
               
                  <button
                    onClick={handleStartMultiCameraRecording}
                    disabled={streamingState.isRecording || streamingState.isScreenRecording}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: COLORS.white,
                      color: COLORS.primary,
                      border: `1px solid ${COLORS.primary}`,
                      borderRadius: 6,
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      opacity: 1,
                    }}
                  >
                    <FaCamera size={14} />
                    recording
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStopRecording}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: COLORS.accent,
                      color: COLORS.white,
                      border: 'none',
                      borderRadius: 6,
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <AnimatedDot />
                    {streamingState.isRecording ? 'Stop Recording' : 'Stop Screen Recording'}
                  </button>
                  
                  {/* Edit Layout Button - Only show for multi-camera recording */}
                  {streamingState.isRecording && (
                    <button
                      onClick={() => {
                        // Load current layout from localStorage
                        const savedLayout = localStorage.getItem('cameraLayout');
                        if (savedLayout) {
                          try {
                            const parsedLayout = JSON.parse(savedLayout);
                            setRecordingLayouts(parsedLayout);
                          } catch (error) {
                            console.error('Error parsing saved layout:', error);
                          }
                        }
                        
                        // Load screen source from localStorage
                        const savedScreenSource = localStorage.getItem('screenSource');
                        if (savedScreenSource) {
                          try {
                            const parsedScreenSource = JSON.parse(savedScreenSource);
                            setRecordingScreenSource(parsedScreenSource);
                          } catch (error) {
                            console.error('Error parsing saved screen source:', error);
                          }
                        }
                        
                        setShowRecordingLayoutEditor(true);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#3b82f6',
                        color: COLORS.white,
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      🎨 Edit Layout
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Upload Buttons */}
            {streamingState.videoBlob && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUpload}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: COLORS.primary,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <FaUpload size={14} />
                  Upload Video
                </button>
                <button
                  onClick={handleCancelUpload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: COLORS.accent,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  ❌ Batal
                </button>
              </div>
            )}


            {/* Status */}
            {streamingState.status && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 500,
                background: streamingState.status.includes('berhasil') ? '#d1fae5' : streamingState.status.includes('Error') ? '#fee2e2' : '#fef3c7',
                color: streamingState.status.includes('berhasil') ? '#065f46' : streamingState.status.includes('Error') ? '#dc2626' : '#d97706',
              }}>
                {streamingState.status}
              </div>
            )}

            {/* Video Preview */}
            {streamingState.videoUrl && (
              <div style={{ marginTop: '16px' }}>
                <video
                  ref={videoRef}
                  src={streamingState.videoUrl}
                  controls
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.border}`,
                  }}
                />
              </div>
            )}


            {/* Live Camera Preview */}
            {(streamingState.isRecording || streamingState.isScreenRecording) && streamingState.recordingStream && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: COLORS.yellow,
                  borderRadius: 6,
                  border: `1px solid ${COLORS.yellowDark}`
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: COLORS.accent,
                    animation: 'pulse 1s infinite'
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text }}>
                    📹 Preview {streamingState.isRecording ? 'Kamera' : 'Layar'} (Sedang Recording)
                    {streamingState.isScreenRecording && ' - Audio: Laptop + Mikrofon'}
                  </span>
                </div>
                <div style={{
                  position: 'relative',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `2px solid ${COLORS.yellow}`,
                  background: '#000'
                }}>
                  <video
                    autoPlay
                    muted
                    style={{
                      width: '100%',
                      height: '400px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    ref={(video) => {
                      if (video && streamingState.recordingStream) {
                        video.srcObject = streamingState.recordingStream;
                      }
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: COLORS.white,
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: COLORS.accent,
                      animation: 'blink 1s infinite'
                    }} />
                    REC
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: COLORS.white,
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    {Math.floor(streamingState.recordingDuration / 60)}:{(streamingState.recordingDuration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Popup Modal */}
        <PopupModal
          open={showPopup}
          onClose={() => setShowPopup(false)}
          message="Silakan pilih kelas dan mata pelajaran terlebih dahulu sebelum melakukan recording."
        />

        {/* Modal Notifikasi */}
        <ModalNotifikasi
          isOpen={showConfirmModal}
          title="Konfirmasi"
          message={confirmMessage}
          type="warning"
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          confirmText="Ya"
          cancelText="Batal"
        />

        {/* Modal Input Judul */}
        {showJudulModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e293b'
              }}>
                Masukkan Judul Recording
              </h3>
              
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#64748b'
              }}>
                Berikan judul yang deskriptif untuk recording {pendingRecordingType === 'camera' ? 'kamera' : 'layar'} Anda.
              </p>

              <input
                type="text"
                value={recordingJudul}
                onChange={(e) => setRecordingJudul(e.target.value)}
                placeholder="Contoh: Tutorial React - Bagian 1"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmRecording();
                  }
                }}
                autoFocus
              />

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowJudulModal(false);
                    setRecordingJudul('');
                    setPendingRecordingType(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmRecording}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                  onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                >
                  Mulai Recording
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Camera Recorder Modal */}
        {showMultiCameraRecorder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: COLORS.white,
              borderRadius: CARD_RADIUS,
              padding: isMobile ? '20px' : '32px',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: SHADOW,
              border: `1px solid ${COLORS.border}`,
              margin: isMobile ? '10px' : '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '24px',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    borderRadius: 8,
                    background: COLORS.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.white,
                  }}>
                    <FaCamera size={isMobile ? 14 : 16} />
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: isMobile ? '18px' : '24px',
                    fontWeight: 700,
                    color: COLORS.text,
                    fontFamily: FONT_FAMILY
                  }}>
                    Multi-Camera Recording
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowMultiCameraRecorder(false);
                    setPendingRecordingType(null);
                  }}
                  style={{
                    background: COLORS.bg,
                    color: COLORS.subtext,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: isMobile ? '8px 12px' : '10px 16px',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    alignSelf: isMobile ? 'flex-end' : 'auto'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = COLORS.accent;
                    e.currentTarget.style.color = COLORS.white;
                    e.currentTarget.style.borderColor = COLORS.accent;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = COLORS.bg;
                    e.currentTarget.style.color = COLORS.subtext;
                    e.currentTarget.style.borderColor = COLORS.border;
                  }}
                >
                  <FaTimes size={12} />
                  Tutup
                </button>
              </div>

              {/* Multi-Camera Status */}
              {multiCameraStatus && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: '14px',
                  fontWeight: 500,
                  background: multiCameraStatus.includes('berhasil') ? '#d1fae5' : 
                             multiCameraStatus.includes('Error') ? '#fee2e2' : '#fef3c7',
                  color: multiCameraStatus.includes('berhasil') ? '#065f46' : 
                         multiCameraStatus.includes('Error') ? '#dc2626' : '#d97706',
                  border: `1px solid ${multiCameraStatus.includes('berhasil') ? '#a7f3d0' : 
                                   multiCameraStatus.includes('Error') ? '#fecaca' : '#fde68a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: multiCameraStatus.includes('berhasil') ? '#10b981' : 
                               multiCameraStatus.includes('Error') ? '#ef4444' : '#f59e0b',
                    animation: multiCameraStatus.includes('Error') ? 'none' : 'blink 1s infinite'
                  }} />
                  {multiCameraStatus}
                </div>
              )}

              <MultiCameraRecorder
                onStartRecording={handleMultiCameraStartRecording}
                onStatusUpdate={handleMultiCameraStatusUpdate}
              />
            </div>
          </div>
        )}

        {/* Recording Layout Editor Modal */}
        {showRecordingLayoutEditor && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '0',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb'
            }}>
              <BasicLayoutEditor
                cameras={recordingCameras}
                onLayoutChange={handleRecordingLayoutChange}
                onClose={() => setShowRecordingLayoutEditor(false)}
                initialLayouts={recordingLayouts}
                screenSource={recordingScreenSource}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminRecordingPage;
