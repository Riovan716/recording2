import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaVideo, FaDownload, FaTrash, FaCalendar, FaUser, FaBook, FaFilter, FaPlay } from 'react-icons/fa';
import { API_URL } from '../config';

// Color palette konsisten dengan AdminPanel
const VIBRANT_BLUE = '#2563EB';
const SOFT_BLUE = '#DBEAFE';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const LIGHT_GRAY = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';
const CARD_RADIUS = 12;
const SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

interface Recording {
  id: number;
  filename: string;
  judul: string;
  mapel: string;
  kelas: string;
  guru: string;
  uploadedAt: string;
  duration?: number;
  size?: number;
}

const AdminVideoListPage: React.FC = () => {
  const { user, token } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordingsPerPage] = useState(12);
  const [selectedRecordings, setSelectedRecordings] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<any>(null);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/recording`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRecordings(data);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Filter recordings
  const filteredRecordings = recordings.filter(rec => {
    const matchSearch = rec.judul.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = !filterDate || new Date(rec.uploadedAt).toDateString() === new Date(filterDate).toDateString();
    
    return matchSearch && matchDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecordings.length / recordingsPerPage);
  const startIndex = (currentPage - 1) * recordingsPerPage;
  const endIndex = startIndex + recordingsPerPage;
  const paginatedRecordings = filteredRecordings.slice(startIndex, endIndex);


  const handleSelectRecording = (id: number) => {
    setSelectedRecordings(prev => 
      prev.includes(id) 
        ? prev.filter(recId => recId !== id)
        : [...prev, id]
    );
  };

  const handlePlayVideo = (recording: any) => {
    setCurrentVideo(recording);
    setShowVideoModal(true);
  };

  const handleSelectAll = () => {
    if (selectedRecordings.length === paginatedRecordings.length) {
      setSelectedRecordings([]);
    } else {
      setSelectedRecordings(paginatedRecordings.map(rec => rec.id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const id of selectedRecordings) {
        await fetch(`${API_URL}/api/recording/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      setSelectedRecordings([]);
      setShowDeleteModal(false);
      fetchRecordings();
    } catch (error) {
      console.error('Error deleting recordings:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        background: LIGHT_GRAY, 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid VIBRANT_BLUE',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: GRAY_TEXT, fontSize: '14px' }}>Memuat daftar video...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '32px', 
      background: LIGHT_GRAY, 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#1e293b', 
          margin: '0 0 8px 0' 
        }}>
          Daftar Video Recording
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: GRAY_TEXT, 
          margin: 0 
        }}>
          Kelola dan lihat semua video pembelajaran yang telah direkam
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: WHITE,
          borderRadius: CARD_RADIUS,
          padding: '20px',
          boxShadow: SHADOW,
          border: `1px solid ${BORDER_COLOR}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, VIBRANT_BLUE, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaVideo size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                {recordings.length}
              </div>
              <div style={{ fontSize: '14px', color: GRAY_TEXT }}>Total Video</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{
        background: WHITE,
        borderRadius: CARD_RADIUS,
        padding: '20px',
        boxShadow: SHADOW,
        border: `1px solid ${BORDER_COLOR}`,
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap', 
          alignItems: 'center'
        }}>
          {/* Search */}
          <div style={{ 
            position: 'relative', 
            flex: '1 1 250px',
            minWidth: '200px',
            maxWidth: '400px'
          }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: GRAY_TEXT,
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder="Cari video..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = VIBRANT_BLUE}
              onBlur={e => e.target.style.borderColor = BORDER_COLOR}
            />
          </div>

          {/* Date Filter */}
          <div style={{ flex: '0 0 auto' }}>
            <input
              type="date"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '10px 12px',
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                width: '140px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Bulk Actions */}
          {selectedRecordings.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.background = '#ef4444'}
            >
              <FaTrash size={14} />
              Hapus ({selectedRecordings.length})
            </button>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {paginatedRecordings.map(recording => (
          <div
            key={recording.id}
            style={{
              background: WHITE,
              borderRadius: CARD_RADIUS,
              boxShadow: SHADOW,
              border: `1px solid ${BORDER_COLOR}`,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOW;
            }}
          >
            {/* Checkbox */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 1
            }}>
              <input
                type="checkbox"
                checked={selectedRecordings.includes(recording.id)}
                onChange={() => handleSelectRecording(recording.id)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Video Thumbnail */}
            <div style={{ position: 'relative', height: '180px', background: '#000' }}>
              <video
                src={`${API_URL}/api/recording/download/${recording.filename}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                muted
                preload="metadata"
              />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500
              }}>
                {recording.duration ? formatDuration(recording.duration) : '--:--'}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1e293b',
                margin: '0 0 8px 0',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {recording.judul}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: GRAY_TEXT }}>
                  <FaCalendar size={12} />
                  <span>{new Date(recording.uploadedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`${API_URL}/api/recording/download/${recording.filename}`}
                  download
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: VIBRANT_BLUE,
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                  onMouseOut={e => e.currentTarget.style.background = VIBRANT_BLUE}
                >
                  <FaDownload size={12} />
                  Download
                </a>
                <button
                  onClick={() => handlePlayVideo(recording)}
                  style={{
                    padding: '8px 12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#059669'}
                  onMouseOut={e => e.currentTarget.style.background = '#10b981'}
                >
                  <FaPlay size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '32px'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: currentPage === 1 ? '#f3f4f6' : WHITE,
              color: currentPage === 1 ? GRAY_TEXT : '#1e293b',
              fontSize: '14px',
              fontWeight: 500,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              boxShadow: currentPage === 1 ? 'none' : SHADOW,
              border: `1px solid ${BORDER_COLOR}`
            }}
          >
            Sebelumnya
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: GRAY_TEXT
          }}>
            <span>Halaman</span>
            <span style={{
              background: VIBRANT_BLUE,
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 600
            }}>
              {currentPage}
            </span>
            <span>dari {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: currentPage === totalPages ? '#f3f4f6' : WHITE,
              color: currentPage === totalPages ? GRAY_TEXT : '#1e293b',
              fontSize: '14px',
              fontWeight: 500,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              boxShadow: currentPage === totalPages ? 'none' : SHADOW,
              border: `1px solid ${BORDER_COLOR}`
            }}
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: WHITE,
            borderRadius: CARD_RADIUS,
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b',
              margin: '0 0 12px 0'
            }}>
              Konfirmasi Hapus
            </h3>
            <p style={{
              fontSize: '14px',
              color: GRAY_TEXT,
              margin: '0 0 20px 0',
              lineHeight: 1.5
            }}>
              Apakah Anda yakin ingin menghapus {selectedRecordings.length} video yang dipilih? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${BORDER_COLOR}`,
                  background: WHITE,
                  color: GRAY_TEXT,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRecordings.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: WHITE,
          borderRadius: CARD_RADIUS,
          boxShadow: SHADOW,
          border: `1px solid ${BORDER_COLOR}`
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#f3f4f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <FaVideo size={32} color={GRAY_TEXT} />
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b',
            margin: '0 0 8px 0'
          }}>
            {searchTerm || filterDate ? 'Tidak ada video yang sesuai' : 'Belum ada video'}
          </h3>
          <p style={{
            fontSize: '14px',
            color: GRAY_TEXT,
            margin: 0
          }}>
            {searchTerm || filterDate 
              ? 'Coba ubah filter pencarian Anda' 
              : 'Mulai buat video recording pertama Anda'
            }
          </p>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoModal && currentVideo && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: WHITE,
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100%',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowVideoModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: GRAY_TEXT,
                zIndex: 1
              }}
            >
              ×
            </button>

            {/* Video Title */}
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b'
            }}>
              {currentVideo.judul || currentVideo.filename}
            </h3>

            {/* Video Player */}
            <video
              controls
              style={{
                width: '100%',
                maxHeight: '70vh',
                borderRadius: '8px'
              }}
            >
              <source src={`${API_URL}/api/recording/download/${currentVideo.filename}`} type="video/mp4" />
              Browser Anda tidak mendukung video player.
            </video>

            {/* Video Info */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '14px',
              color: GRAY_TEXT
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCalendar size={12} />
                <span>{new Date(currentVideo.uploadedAt).toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              marginTop: '20px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <a
                href={`${API_URL}/api/recording/download/${currentVideo.filename}`}
                download
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: VIBRANT_BLUE,
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseOut={e => e.currentTarget.style.background = VIBRANT_BLUE}
              >
                <FaDownload size={14} />
                Download Video
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideoListPage;
