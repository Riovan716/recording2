import React, { useEffect, useState, useCallback } from 'react';
import { FaTh, FaSquare, FaColumns, FaCheck, FaTimes, FaRedo, FaStar, FaVideo, FaPlay, FaCamera, FaTimes as FaClose } from 'react-icons/fa';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

type LayoutType = 'grid' | 'pip' | 'split';

interface MultiCameraRecorderProps {
  onStartRecording: (selectedCameras: string[], layoutType: LayoutType, judul: string) => void;
  onStatusUpdate: (status: string) => void;
  onClose?: () => void;
}

const MultiCameraRecorder: React.FC<MultiCameraRecorderProps> = ({
  onStartRecording,
  onStatusUpdate,
  onClose
}) => {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<LayoutType>('grid');
  const [recordingJudul, setRecordingJudul] = useState('');
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  // Detect available cameras
  const getAvailableCameras = useCallback(async () => {
    if (isLoadingCameras) return; // Prevent multiple calls
    
    try {
      setIsLoadingCameras(true);
      onStatusUpdate('Mendeteksi kamera yang tersedia...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Enumerate devices tidak didukung di browser ini');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));

      setAvailableCameras(cameras);
      onStatusUpdate(`Ditemukan ${cameras.length} kamera`);
      
      console.log('Available cameras:', cameras);
    } catch (error: any) {
      console.error('Error getting cameras:', error);
      onStatusUpdate('Gagal mendeteksi kamera: ' + error.message);
    } finally {
      setIsLoadingCameras(false);
    }
  }, [onStatusUpdate, isLoadingCameras]);

  // Toggle camera selection
  const toggleCameraSelection = useCallback((deviceId: string) => {
    setSelectedCameras(prev => {
      const isSelected = prev.includes(deviceId);
      const newSelected = isSelected
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId];
      
      onStatusUpdate(`${newSelected.length} kamera dipilih`);
      return newSelected;
    });
  }, [onStatusUpdate]);

  // Start recording
  const handleStartRecording = () => {
    if (selectedCameras.length === 0) {
      onStatusUpdate('Pilih setidaknya satu kamera untuk recording');
      return;
    }

    if (selectedCameras.length > 4) {
      onStatusUpdate('Maksimal 4 kamera untuk recording');
      return;
    }

    if (!recordingJudul.trim()) {
      onStatusUpdate('Judul recording harus diisi!');
      return;
    }

    onStartRecording(selectedCameras, layoutType, recordingJudul);
  };

  // Initialize cameras on mount
  useEffect(() => {
    getAvailableCameras();
  }, []); // Empty dependency array to run only once

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ 
        width: '100%', 
        maxWidth: '600px', 
        margin: '0 auto', 
        backgroundColor: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaCamera style={{ fontSize: '18px', color: 'black' }} />
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: 'black', margin: 0 }}>Multi-Camera Recording</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '8px 12px', 
              fontSize: '14px', 
              color: 'black', 
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaClose style={{ fontSize: '14px' }} />
            Tutup
          </button>
        )}
      </div>

      {/* Notification Bar */}
      <div style={{ backgroundColor: '#facc15', padding: '8px 16px' }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>
          Ditemukan {availableCameras.length} kamera
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Judul Recording Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FaStar style={{ fontSize: '14px', color: 'black' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>Judul Recording</h3>
            <FaCamera style={{ fontSize: '14px', color: 'black', marginLeft: 'auto' }} />
          </div>
          
          <input
            type="text"
            value={recordingJudul}
            onChange={(e) => setRecordingJudul(e.target.value)}
            placeholder="Masukkan judul yang sesuai"
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px', 
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'black';
              e.currentTarget.style.boxShadow = '0 0 0 1px black';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Pilih Kamera Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCamera style={{ fontSize: '14px', color: 'black' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>Pilih Kamera</h3>
            </div>
            <button
              onClick={getAvailableCameras}
              disabled={isLoadingCameras}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                fontSize: '14px', 
                color: 'black', 
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FaRedo style={{ 
                fontSize: '14px', 
                animation: isLoadingCameras ? 'spin 1s linear infinite' : 'none'
              }} />
              Refresh
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableCameras.map((camera, index) => {
              const isSelected = selectedCameras.includes(camera.deviceId);
              
              return (
                <label
                  key={camera.deviceId}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    border: `1px solid ${isSelected ? 'black' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#f9fafb' : 'white',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCameraSelection(camera.deviceId)}
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      accentColor: 'black'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: 'black', flex: 1 }}>
                    {camera.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Layout Kamera Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FaTh style={{ fontSize: '14px', color: 'black' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>Layout Kamera</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Grid Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              border: `1px solid ${layoutType === 'grid' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'grid' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (layoutType !== 'grid') {
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (layoutType !== 'grid') {
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}>
              <input
                type="radio"
                name="layout"
                value="grid"
                checked={layoutType === 'grid'}
                onChange={() => setLayoutType('grid')}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  accentColor: 'black'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                      <rect x="2" y="2" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="14" y="14" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M14 14L6 6" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Grid Layout</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Semua kamera dalam grid</p>
                  </div>
                </div>
              </div>
            </label>

            {/* Picture-in-Picture Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              border: `1px solid ${layoutType === 'pip' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'pip' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (layoutType !== 'pip') {
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (layoutType !== 'pip') {
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}>
              <input
                type="radio"
                name="layout"
                value="pip"
                checked={layoutType === 'pip'}
                onChange={() => setLayoutType('pip')}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  accentColor: 'black'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                      <rect x="2" y="2" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="14" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Picture-in-Picture</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Satu utama, lainnya kecil</p>
                  </div>
                </div>
              </div>
            </label>

            {/* Split Screen Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              border: `1px solid ${layoutType === 'split' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'split' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (layoutType !== 'split') {
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (layoutType !== 'split') {
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}>
              <input
                type="radio"
                name="layout"
                value="split"
                checked={layoutType === 'split'}
                onChange={() => setLayoutType('split')}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  accentColor: 'black'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                      <rect x="2" y="2" width="9" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="13" y="2" width="9" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M11 2V22" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Split Screen</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Bagi layar secara equal</p>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Mulai Recording Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
          <button
            onClick={handleStartRecording}
            disabled={selectedCameras.length === 0 || !recordingJudul.trim()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 32px', 
              borderRadius: '6px', 
              fontSize: '14px', 
              fontWeight: '500',
              backgroundColor: selectedCameras.length === 0 || !recordingJudul.trim() ? '#d1d5db' : '#f3f4f6',
              color: selectedCameras.length === 0 || !recordingJudul.trim() ? '#6b7280' : 'black',
              border: selectedCameras.length === 0 || !recordingJudul.trim() ? 'none' : '1px solid #d1d5db',
              cursor: selectedCameras.length === 0 || !recordingJudul.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedCameras.length > 0 && recordingJudul.trim()) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCameras.length > 0 && recordingJudul.trim()) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
          >
            <FaPlay style={{ fontSize: '14px' }} />
            Mulai Recording
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default MultiCameraRecorder;