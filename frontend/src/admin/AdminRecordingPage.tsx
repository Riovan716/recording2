import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStreaming } from '../context/StreamingContext';
import { FaVideo, FaUpload, FaStop, FaDownload, FaUser, FaBook, FaCamera, FaTimes } from 'react-icons/fa';
import ModalNotifikasi from '../components/ModalNotifikasi';
import MultiCameraRecorder from '../components/MultiCameraRecorder';
import BasicLayoutEditor from '../components/BasicLayoutEditor';
import { API_URL } from '../config';

// Color palette konsisten dengan AdminPanel
const LIGHT_GREEN = '#BBF7D0';
const SOFT_GREEN = '#DCFCE7';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const CARD_RADIUS = 18;
const SHADOW = '0 4px 24px rgba(187,247,208,0.12)';
const FONT_FAMILY = 'Poppins, Inter, Segoe UI, Arial, sans-serif';

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: LIGHT_GREEN,
  primaryDark: '#86EFAC',
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
    width: 8, 
    height: 8, 
    borderRadius: '50%',
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
  const navigate = useNavigate();
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
  const [currentRecordingLayoutType, setCurrentRecordingLayoutType] = useState<string>('');
  const [showFinishedPage, setShowFinishedPage] = useState(false);
  const [finishedRecordingData, setFinishedRecordingData] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error', duration: number} | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      setCurrentRecordingLayoutType('');
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
    handleStopAndPrepareFinishedPage(); // Call the new function here
  };

  const handleStopAndPrepareFinishedPage = async () => {
    try {
      // Wait a bit for the videoBlob to be updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Debug logging
      console.log('Debug - streamingState.videoBlob:', streamingState.videoBlob);
      console.log('Debug - streamingState.videoUrl:', streamingState.videoUrl);
      
      const finishedData = {
        judul: recordingJudul || 'Recording Baru',
        duration: streamingState.recordingDuration || 1,
        resolution: '1080p (Full HD)',
        frameRate: 60,
        size: 0, // Initial size is 0, will be updated after upload
        cameras: recordingCameras.length || 1,
        layers: recordingLayouts.length || 1,
        quality: 'Excellent',
        bitrate: 5.0,
        uploadedAt: new Date().toISOString(),
        isUploaded: false, // New flag to track upload status
        videoBlob: streamingState.videoBlob, // Store the blob for preview/download
        videoUrl: streamingState.videoUrl, // Also store videoUrl as fallback
      };
      
      console.log('Debug - finishedData:', finishedData);
      setFinishedRecordingData(finishedData);
      setShowFinishedPage(true);
    } catch (err) {
      console.error("Error preparing finished page data:", err);
    }
  };

  const handleUploadVideo = async () => {
    if (!streamingState.videoBlob) {
      console.error("No video blob available for upload.");
      setNotification({
        message: 'Tidak ada video untuk diunggah.',
        type: 'error',
        duration: 3000,
      });
      return;
    }
    try {
      // Perform the actual upload
      await uploadRecording();
      fetchRecordings(); // Refresh the list of recordings

      // Update finishedRecordingData to reflect upload status and actual size
      setFinishedRecordingData((prevData: any) => ({
        ...prevData,
        size: streamingState.videoBlob ? streamingState.videoBlob.size : prevData.size,
        isUploaded: true,
      }));
      setNotification({
        message: 'Video berhasil diunggah!',
        type: 'success',
        duration: 3000,
      });
      
      // Redirect to recording page after upload
      setTimeout(() => {
        handleBackToRecording();
      }, 1000);
    } catch (err) {
      console.error("Error uploading video:", err);
      setNotification({
        message: 'Gagal mengunggah video.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handlePreviewVideo = (blob: Blob | null, videoUrl?: string) => {
    if (blob) {
      const videoUrl = URL.createObjectURL(blob);
      window.open(videoUrl, '_blank');
    } else if (videoUrl) {
      window.open(videoUrl, '_blank');
    } else {
      setNotification({
        message: 'Video tidak tersedia untuk pratinjau.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleDownloadVideo = (blob: Blob | null, filename: string) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({
        message: 'Video berhasil diunduh!',
        type: 'success',
        duration: 3000,
      });
    } else {
      setNotification({
        message: 'Video blob tidak tersedia untuk diunduh.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handlePlayVideo = (recording: any) => {
    setSelectedVideo(recording);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteVideo = (recording: any) => {
    setVideoToDelete(recording);
    setShowDeleteVideoModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteVideoModal(false);
    setVideoToDelete(null);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`${API_URL}/api/recording/${videoToDelete.id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        setNotification({
          message: 'Video berhasil dihapus!',
          type: 'success',
          duration: 3000,
        });
        fetchRecordings();
      } else {
        setNotification({
          message: 'Gagal menghapus video.',
          type: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      setNotification({
        message: 'Gagal menghapus video.',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      handleCloseDeleteModal();
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
      
      // Store the layout type for this recording session
      setCurrentRecordingLayoutType(layoutType);
      
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

  const handleBackToRecording = () => {
    setShowFinishedPage(false);
    setFinishedRecordingData(null);
    // Reset recording state
    setRecordingCameras([]);
    setRecordingScreenSource(null);
    setRecordingLayouts([]);
    setCurrentRecordingLayoutType('');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Show finished page if upload was successful
  if (showFinishedPage && finishedRecordingData) {
    return (
      <div style={{ 
        padding: isMobile ? "16px" : "32px",
        maxWidth: "100%",
        overflowX: "hidden",
        background: '#f3f4f6',
        fontFamily: FONT_FAMILY,
        minHeight: '100vh',
      }}>
        {/* Recording Selesai Banner */}
        <div style={{
          background: '#d1fae5',
          borderRadius: 12,
          padding: isMobile ? '20px' : '32px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="fas fa-check" style={{ fontSize: '32px', color: 'white' }}></i>
          </div>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1f2937',
              margin: '0 0 8px 0',
            }}>
              Recording Selesai!
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: 0,
              fontWeight: 400,
            }}>
              Video recording Anda telah berhasil disimpan dan siap untuk digunakan
            </p>
          </div>
        </div>

        {/* Ringkasan Recording */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: isMobile ? '20px' : '32px',
          marginBottom: 32,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1f2937',
            margin: '0 0 24px 0',
          }}>
            Ringkasan Recording
          </h2>

          <div style={{
            display: 'flex',
            gap: '24px',
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            {/* Video Thumbnail */}
            <div style={{
              width: isMobile ? '100%' : '200px',
              height: '120px',
              borderRadius: 8,
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {(() => {
                const videoBlob = finishedRecordingData.videoBlob || streamingState.videoBlob;
                const videoUrl = finishedRecordingData.videoUrl || streamingState.videoUrl;
                
                console.log('Debug - Thumbnail videoBlob:', videoBlob);
                console.log('Debug - Thumbnail videoUrl:', videoUrl);
                
                if (videoBlob) {
                  return (
                    <video
                      src={URL.createObjectURL(videoBlob)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      muted
                      preload="metadata"
                    />
                  );
                } else if (videoUrl) {
                  return (
                    <video
                      src={videoUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      muted
                      preload="metadata"
                    />
                  );
                } else {
                  return (
                    <i className="fas fa-video" style={{ fontSize: '32px', color: '#10b981' }}></i>
                  );
                }
              })()}
            </div>

            {/* Recording Details */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
              gap: '12px',
              alignItems: 'start',
            }}>
              <div style={{ fontWeight: 600, color: '#374151' }}>JUDUL RECORDING:</div>
              <div style={{ color: '#6b7280' }}>{finishedRecordingData.judul}</div>

              <div style={{ fontWeight: 600, color: '#374151' }}>DURASI:</div>
              <div style={{ color: '#6b7280' }}>{formatDuration(finishedRecordingData.duration)}</div>

              <div style={{ fontWeight: 600, color: '#374151' }}>RESOLUTION:</div>
              <div style={{ color: '#6b7280' }}>{finishedRecordingData.resolution}</div>

              <div style={{ fontWeight: 600, color: '#374151' }}>FRAME RATE:</div>
              <div style={{ color: '#6b7280' }}>{finishedRecordingData.frameRate} FPS</div>

              <div style={{ fontWeight: 600, color: '#374151' }}>UKURAN FILE:</div>
              <div style={{ color: '#6b7280' }}>
                {finishedRecordingData.isUploaded && finishedRecordingData.size > 0
                  ? formatFileSize(finishedRecordingData.size)
                  : 'Belum diunggah'}
              </div>

              <div style={{ fontWeight: 600, color: '#374151' }}>WAKTU SIMPAN:</div>
              <div style={{ color: '#6b7280' }}>{formatDate(finishedRecordingData.uploadedAt)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => handlePreviewVideo(
              finishedRecordingData.videoBlob || streamingState.videoBlob, 
              finishedRecordingData.videoUrl || streamingState.videoUrl
            )}
            style={{
              padding: '12px 24px',
              background: '#ffffff',
              color: '#10b981',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0fdf4';
              e.currentTarget.style.borderColor = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <i className="fas fa-play" style={{ fontSize: '14px' }}></i>
            Preview Video
          </button>

          {/* NEW: Upload Video Button */}
          <button
            onClick={handleUploadVideo}
            disabled={finishedRecordingData.isUploaded}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: finishedRecordingData.isUploaded ? '#e5e7eb' : '#10b981', // Green if not uploaded, gray if uploaded
              color: finishedRecordingData.isUploaded ? '#6b7280' : '#ffffff', // White text
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: finishedRecordingData.isUploaded ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: finishedRecordingData.isUploaded ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              if (!finishedRecordingData.isUploaded) {
                e.currentTarget.style.background = '#059669'; // Darker green on hover
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!finishedRecordingData.isUploaded) {
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <i className="fas fa-upload" style={{ fontSize: '14px' }}></i>
            {finishedRecordingData.isUploaded ? 'Uploaded' : 'Upload Video'}
          </button>

          <button
            onClick={handleBackToRecording}
            style={{
              padding: '12px 24px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className="fas fa-times" style={{ fontSize: '14px' }}></i>
            Batal
          </button>
        </div>
      </div>
    );
  }

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
        padding: isMobile ? "16px" : "32px",
        maxWidth: "100%",
        overflowX: "hidden",
        background: COLORS.bg,
        fontFamily: FONT_FAMILY,
      }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
            maxWidth: "1400px",
            margin: "0 auto",
            padding: isMobile ? "0" : "0 88px 0 0",
          }}
        >
          {/* Welcome Card */}
          <div style={{
     background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
            borderRadius: CARD_RADIUS,
            color: '#1e293b',
            padding: isMobile ? '18px 12px' : '32px 40px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: SHADOW,
            minHeight: 120,
            width: '100%',
          }}>
            <div>
              <div style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500
              }}>
                <i className="fas fa-calendar-days" style={{ fontSize: '14px' }}></i>
                {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1f2937' }}>Video Recording</div>
              <div style={{ fontSize: 14, color: '#9ca3af', lineHeight: '1.5', maxWidth: '500px', fontWeight: 400 }}>
                Selamat datang, {user?.name || 'Admin'}! Buat dan kelola video pembelajaran Anda dengan mudah.
              </div>
            </div>
            <span style={{ height: 100, fontSize: 100, objectFit: 'contain', marginLeft: isMobile ? 0 : 32, marginTop: isMobile ? 18 : 0, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 4px 24px #0002)' }}>🎥</span>
          </div>


          {/* Recording Controls */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          border: 'none',
          borderRadius: 24,
          padding: isMobile ? "20px" : "32px 40px",
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
          width: '100%',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}>
            {/* Modern Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(187, 247, 208, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(134, 239, 172, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(-50%, 50%)',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ 
                fontSize: "24px",
                fontWeight: 700,
                color: COLORS.text,
                margin: "0 0 8px 0",
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Buat Video Recording
              </h2>
              <p style={{
                fontSize: "14px",
                color: COLORS.subtext,
                margin: "0 0 24px 0",
                fontWeight: 500,
              }}>
                Buat dan kelola recording video dengan mudah
              </p>
            </div>
            
            

            {/* Recording Buttons */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '16px' }}>
                {!(streamingState.isRecording || streamingState.isScreenRecording) ? (
                  <>
                 
                    <button
                      onClick={handleStartMultiCameraRecording}
                      disabled={streamingState.isRecording || streamingState.isScreenRecording || streamingState.isStreaming}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: streamingState.isStreaming 
                          ? 'linear-gradient(135deg, #64748b 0%, #64748b 100%)' 
                          : 'linear-gradient(135deg, #86EFAC 0%, #86EFAC 100%)',  
                        color: "white",
                        border: 'none',
                        borderRadius: 16,
                        padding: '14px 24px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: streamingState.isStreaming ? 'not-allowed' : 'pointer',
                        opacity: streamingState.isStreaming ? 0.6 : 1,
                        width: 'auto',
                        boxShadow: streamingState.isStreaming
                          ? 'none'
                          : '0 8px 20px rgba(74, 222, 128, 0.3), 0 4px 8px rgba(74, 222, 128, 0.2)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        if (!streamingState.isStreaming) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 12px 28px rgba(74, 222, 128, 0.4), 0 6px 12px rgba(74, 222, 128, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!streamingState.isStreaming) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(74, 222, 128, 0.3), 0 4px 8px rgba(74, 222, 128, 0.2)';
                        }
                      }}
                      title={streamingState.isStreaming ? 'Live streaming sedang aktif. Stop live streaming terlebih dahulu untuk memulai recording.' : ''}
                    >
                      <span style={{ fontSize: '18px' }}>🎥</span>
                      Multi-Camera Recording {streamingState.isStreaming ? '(Live Streaming Aktif)' : ''}
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

                  
                  
                  {/* Edit Layout Button - Only show for multi-camera recording with custom layout */}
                  {streamingState.isRecording && currentRecordingLayoutType === 'custom' && (
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
            </div>

                      {/* Video List Section */}
          {!streamingState.isRecording && !streamingState.isScreenRecording && recordings && recordings.length > 0 && (
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: isMobile ? "16px" : "20px",
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937', marginBottom: '20px' }}>
                Daftar Video Tersimpan
              </h2>
              
              {/* Table Header */}
              <div style={{
                display: isMobile ? "none" : "grid",
                gridTemplateColumns: "120px 1fr 100px 140px 120px",
                gap: "12px",
                padding: "16px 20px",
                fontWeight: 500,
                color: '#6b7280',
                fontSize: "14px",
                background: '#f9fafb',
                borderRadius: "12px 12px 0 0",
                border: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div>Video</div>
                <div style={{ textAlign: "center" }}>Judul</div>
                <div style={{ textAlign: "center" }}>Durasi</div>
                <div style={{ textAlign: "center" }}>Tanggal & Waktu</div>
                <div style={{ textAlign: "center" }}>Aksi</div>
              </div>

              {/* Table Body */}
              <div style={{
                background: '#ffffff',
                borderRadius: isMobile ? "12px" : "0 0 12px 12px",
                border: '1px solid #e5e7eb',
                borderTop: isMobile ? '1px solid #e5e7eb' : "none"
              }}>
                {recordings.slice(0, 10).map((recording: any, index: number) => (
                  <div key={recording.id} style={{
                    display: isMobile ? "block" : "grid",
                    gridTemplateColumns: "120px 1fr 100px 140px 120px",
                    gap: "12px",
                    padding: "16px 20px",
                    borderBottom: index < recordings.slice(0, 10).length - 1 ? '1px solid #e5e7eb' : "none",
                    transition: "all 0.3s ease",
                    background: "transparent"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", justifyContent: "center", height: "70px", borderRadius: "8px", background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))', position: "relative", overflow: "hidden" }}>
                      <video style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} muted preload="metadata" src={`${API_URL}/api/recording/download/${recording.filename}`} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af;"><div style="font-size: 24px;">📹</div></div>'; }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "70px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 500, color: '#6b7280', lineHeight: 1.3 }}>{recording.judul || recording.filename}</div>
                    </div>
                    <div style={{ display: isMobile ? "none" : "flex", justifyContent: "center", alignItems: "center", fontSize: "13px", color: '#6b7280' }}>
                      {recording.duration ? `${Math.floor(recording.duration / 60)}m` : '0m'}
                    </div>
                    <div style={{ display: isMobile ? "none" : "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontSize: "13px", color: '#6b7280' }}>
                      <div style={{ fontWeight: 500, marginBottom: "2px" }}>{new Date(recording.uploadedAt || recording.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                      <div style={{ color: '#9ca3af', fontSize: "11px" }}>{new Date(recording.uploadedAt || recording.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => handlePlayVideo(recording)} style={{ padding: "8px", background: '#ffffff', color: '#10b981', border: "1px solid #10b981", borderRadius: 8, fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#10b981'; }}>
                        <i className="fas fa-play" style={{ fontSize: "12px" }}></i>
                </button>
                      <button onClick={() => handleDeleteVideo(recording)} style={{ padding: "8px", background: '#ffffff', color: '#ef4444', border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", fontSize: "12px", fontWeight: 500 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#ef4444'; }}>
                        <i className="fas fa-trash" style={{ fontSize: "12px" }}></i>
                </button>
                    </div>
                  </div>
                ))}
              </div>
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
              padding: isMobile ? '20px' : '24px',
              maxWidth: '480px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: SHADOW,
              border: `1px solid ${COLORS.border}`,
              margin: isMobile ? '10px' : '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '16px',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                    borderRadius: 8,
                    background: COLORS.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.white,
                  }}>
                    <FaCamera size={isMobile ? 12 : 14} />
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: 600,
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

      {/* Video Player Modal */}
      {showVideoModal && selectedVideo && (
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
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '16px',
            maxWidth: '800px',
            maxHeight: '80vh',
            width: '90%',
            position: 'relative'
          }}>
            <button onClick={handleCloseVideoModal} style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              zIndex: 10001
            }}>
              ✕
            </button>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b'
            }}>
              {selectedVideo.judul || selectedVideo.filename}
            </h3>
            <div style={{
              width: '100%',
              margin: '0 auto'
            }}>
              <video
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}
                src={`${API_URL}/api/recording/download/${selectedVideo.filename}`}
              >
                Browser Anda tidak mendukung video player.
              </video>
            </div>
            <div style={{
              marginTop: '12px',
              fontSize: '13px',
              color: '#64748b'
            }}>
              <strong>Tanggal:</strong> {new Date(selectedVideo.uploadedAt || selectedVideo.createdAt).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Confirmation Modal */}
      {showDeleteVideoModal && videoToDelete && (
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
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <button onClick={handleCloseDeleteModal} style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              zIndex: 10001
            }}>
              ✕
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>
                Hapus Video?
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus video <strong>"{videoToDelete.judul || videoToDelete.filename}"</strong>?
                <br /><br />
                <strong style={{ color: '#ef4444' }}>Tindakan ini tidak dapat dibatalkan!</strong>
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={handleCloseDeleteModal} disabled={isDeleting} style={{
                  padding: '12px 24px',
                  background: '#e5e7eb',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}>
                  Batal
                </button>
                <button onClick={confirmDeleteVideo} disabled={isDeleting} style={{
                  padding: '12px 24px',
                  background: isDeleting ? '#64748b' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}>
                  {isDeleting ? '⏳ Menghapus...' : '🗑️ Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

export default AdminRecordingPage;
