import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaVideo, FaTrash, FaCalendar, FaUser, FaBook, FaFilter, FaPlay } from 'react-icons/fa';
import { API_URL } from '../config';

// Color palette konsisten dengan AdminPanel
const LIGHT_GREEN = '#BBF7D0';
const SOFT_GREEN = '#DCFCE7';
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
  const [recordingsPerPage] = useState(8);
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

  // Pagination logic
  const totalPages = Math.ceil(filteredRecordings.length / recordingsPerPage);
  const startIndex = (currentPage - 1) * recordingsPerPage;
  const endIndex = startIndex + recordingsPerPage;
  const paginatedRecordings = filteredRecordings.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);



  const handlePlayVideo = (recording: any) => {
    setCurrentVideo(recording);
    setShowVideoModal(true);
  };

  const handleDeleteVideo = async (recording: any) => {
    try {
      await fetch(`${API_URL}/api/recording/${recording.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setShowDeleteModal(false);
      setCurrentVideo(null);
      fetchRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
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
            borderTop: '4px solid LIGHT_GREEN',
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
      <div style={{
        background: LIGHT_GREEN,
        borderRadius: 18,
        color: '#1e293b',
        padding: '32px 40px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
        minHeight: 120,
      }}>
        <div>
          <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 8 }}>
            {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            Video Recording
          </div>
          <div style={{ fontSize: 16, opacity: 0.9 }}>
            Selamat datang, {user?.name || 'Administrator'}! kelola video Anda dengan mudah.
          </div>
        </div>
        <span style={{ 
          height: 100, 
          fontSize: 100, 
          objectFit: 'contain', 
          marginLeft: 32, 
          display: 'flex', 
          alignItems: 'center', 
          filter: 'drop-shadow(0 4px 24px #0002)' 
        }}>
          📹
        </span>
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
              onFocus={e => e.target.style.borderColor = LIGHT_GREEN}
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

        </div>
      </div>

      {/* Video Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
        maxWidth: '1200px',
        margin: '0 auto 32px auto'
      }}>
        {paginatedRecordings.map(recording => (
          <div
            key={recording.id}
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: 'none',
              borderRadius: 24,
              padding: 0,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
              overflow: "hidden",
              minHeight: "300px",
              maxWidth: "320px",
              display: "flex",
              flexDirection: "column",
              position: 'relative',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
              e.currentTarget.style.boxShadow = '0 32px 64px rgba(0, 0, 0, 0.12), 0 16px 32px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)';
            }}
          >
            {/* Modern Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(187, 247, 208, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(134, 239, 172, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(-30%, 30%)',
            }} />

            {/* Preview Image/Thumbnail */}
            <div
              style={{
                width: "100%",
                height: "140px",
                background: `linear-gradient(135deg, rgba(187, 247, 208, 0.1) 0%, rgba(134, 239, 172, 0.05) 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
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
            <div style={{ 
              padding: '16px', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              zIndex: 1
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1e293b',
                margin: '0 0 10px 0',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {recording.judul}
              </h3>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                marginBottom: '16px',
                flex: 1
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '13px', 
                  color: '#64748b',
                  fontWeight: 500
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>📆</span>
                  {new Date(recording.uploadedAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit", 
                    year: "numeric"
                  })}
                </div>
              </div>

              {/* Modern Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "auto",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => handlePlayVideo(recording)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white',
                    border: "none",
                    borderRadius: 12,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 197, 94, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                  }}
                >
                  <span style={{ fontSize: "14px" }}>▶</span>
                  Play Video
                </button>

                <button
                  onClick={() => {
                    setCurrentVideo(recording);
                    setShowDeleteModal(true);
                  }}
                  style={{
                    width: "40px",
                    height: "40px",
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <span style={{ fontSize: "14px" }}>🗑</span>
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
          gap: '8px',
          marginTop: '24px',
          padding: '16px 0'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: currentPage === 1 ? '#f3f4f6' : WHITE,
              color: currentPage === 1 ? GRAY_TEXT : '#1e293b',
              fontSize: '16px',
              fontWeight: 500,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              boxShadow: currentPage === 1 ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${BORDER_COLOR}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ←
          </button>

          <div style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: currentPage === page ? LIGHT_GREEN : WHITE,
                  color: currentPage === page ? '#1e293b' : GRAY_TEXT,
                  fontSize: '14px',
                  fontWeight: currentPage === page ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: currentPage === page ? '0 2px 8px rgba(187, 247, 208, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  border: `1px solid ${currentPage === page ? LIGHT_GREEN : BORDER_COLOR}`,
                  transition: 'all 0.2s ease'
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: currentPage === totalPages ? '#f3f4f6' : WHITE,
              color: currentPage === totalPages ? GRAY_TEXT : '#1e293b',
              fontSize: '16px',
              fontWeight: 500,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              boxShadow: currentPage === totalPages ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${BORDER_COLOR}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            →
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
              Apakah Anda yakin ingin menghapus video "{currentVideo?.judul}"? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCurrentVideo(null);
                }}
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
                onClick={() => currentVideo && handleDeleteVideo(currentVideo)}
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
            padding: '16px',
            maxWidth: '800px',
            maxHeight: '80vh',
            width: '90%',
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
              margin: '0 0 16px 0',
              fontSize: '16px',
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
                maxHeight: '400px',
                borderRadius: '8px'
              }}
            >
              <source src={`${API_URL}/api/recording/download/${currentVideo.filename}`} type="video/mp4" />
              Browser Anda tidak mendukung video player.
            </video>

            {/* Video Info */}
            <div style={{
              marginTop: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px',
              color: GRAY_TEXT
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCalendar size={12} />
                <span>{new Date(currentVideo.uploadedAt).toLocaleDateString('id-ID')}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideoListPage;
