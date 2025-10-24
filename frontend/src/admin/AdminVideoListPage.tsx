import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FaSearch } from "react-icons/fa";
import { API_URL } from "../config";

// Color palette konsisten dengan AdminPanel
const LIGHT_GREEN = "#BBF7D0";
const SOFT_GREEN = "#DCFCE7";
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const CARD_RADIUS = 18;
const SHADOW = "0 4px 24px rgba(187,247,208,0.12)";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: LIGHT_GREEN,
  primaryDark: "#86EFAC",
  accent: "#ef4444",
  accentDark: "#dc2626",
  text: "#1e293b",
  subtext: GRAY_TEXT,
  border: "#e5e7eb",
  bg: LIGHT_GRAY,
  white: WHITE,
  green: "#22c55e",
  greenDark: "#16a34a",
  red: "#ef4444",
  redDark: "#dc2626",
  yellow: "#facc15",
  yellowDark: "#eab308",
  blue: "#3b82f6",
  blueDark: "#2563eb",
};

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Recording | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Fetch recordings
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/recording`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
        console.log('Recordings loaded:', data);
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const handlePlayVideo = (recording: Recording) => {
    setSelectedVideo(recording);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteVideo = (recording: Recording) => {
    setVideoToDelete(recording);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    
    try {
      setDeleting(true);
      if (!token) {
        alert('Anda harus login untuk menghapus video');
        return;
      }
      
      console.log('Sending DELETE request to:', `${API_URL}/api/recording/${videoToDelete.id}`);
      
      const response = await fetch(`${API_URL}/api/recording/${videoToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        // Remove from local state
        setRecordings(prev => prev.filter(recording => recording.id !== videoToDelete.id));
        
        setShowDeleteModal(false);
        setVideoToDelete(null);
      } else {
        const errorData = await response.json();
        alert(`Gagal menghapus video: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Gagal menghapus video. Silakan coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedRecordings = recordings
    .filter(recording => {
      // Search term filter
      const searchMatch = !searchTerm || 
        (recording.judul && recording.judul.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recording.filename && recording.filename.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Date filter
      const dateMatch = !filterDate || 
        (recording.uploadedAt && new Date(recording.uploadedAt).toDateString() === new Date(filterDate).toDateString());
      
      return searchMatch && dateMatch;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedRecordings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecordings = filteredAndSortedRecordings.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: '#f3f4f6',
          fontFamily: FONT_FAMILY,
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: "center", color: '#6b7280' }}>
          <div style={{ fontSize: "18px", marginBottom: "8px", fontWeight: 500 }}>
            Memuat...
          </div>
          <div style={{ fontSize: "14px", color: '#9ca3af' }}>
            Menyiapkan data daftar video
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "16px" : "32px",
        maxWidth: "100%",
        overflowX: "hidden",
        background: '#f3f4f6',
        fontFamily: FONT_FAMILY,
        minHeight: '100vh',
      }}
    >
      {/* Hero Banner */}
      <div style={{
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
        borderRadius: 12,
        color: '#1f2937',
        padding: isMobile ? '18px 12px' : '32px 40px',
        marginBottom: 32,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        minHeight: 120,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: 15, 
            color: '#64748b', 
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-calendar-days" style={{ fontSize: '14px' }}></i>
            {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1f2937' }}>
            Daftar Video
          </div>
          <div style={{ fontSize: 14, color: '#4b5563', lineHeight: '1.5', maxWidth: '500px' }}>
            Selamat datang, {user?.name || 'Admin'}! Lihat daftar video yang telah tersimpan.
          </div>
        </div>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
          borderRadius: '12px',
          marginLeft: isMobile ? 0 : 32,
          marginTop: isMobile ? 18 : 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '24px', color: '#10b981' }}>📹</div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Videos</div>
          </div>
        </div>
      </div>

      {/* Video List Container */}
      <div
        style={{
          background: '#f3f4f6',
          borderRadius: 12,
          padding: isMobile ? "16px" : "20px",
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        
        {/* Filters & Search Section */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <i className="fas fa-history" style={{ fontSize: '16px', color: '#6b7280' }}></i>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#6b7280',
                margin: 0,
              }}>
                Filter & Pencarian
              </h3>
            </div>
            <button
              onClick={() => {
                fetchRecordings();
              }}
              style={{
                padding: "8px 12px",
                background: '#f0f9ff',
                color: '#6b7280',
                border: "1px solid #e0f2fe",
                borderRadius: 8,
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e0f2fe';
                e.currentTarget.style.color = '#0369a1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f0f9ff';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <i className="fas fa-sync-alt" style={{ fontSize: '12px' }}></i>
              Refresh
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Search Input */}
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
                color: '#9ca3af',
                fontSize: '14px'
              }} />
              <input
                type="text"
                placeholder="Cari berdasarkan judul..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  color: '#6b7280',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Date Filter */}
            <div style={{ flex: '0 0 auto' }}>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  background: '#ffffff',
                  color: '#6b7280',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Filter Button */}
            <button
              style={{
                padding: '10px 16px',
                background: '#f9fafb',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <i className="fas fa-filter" style={{ fontSize: '12px' }}></i>
              Filter
            </button>
          </div>
        </div>
        
        {filteredAndSortedRecordings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: '#6b7280',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📺</div>
            <div style={{ fontSize: "18px", fontWeight: 500, marginBottom: "8px", color: '#374151' }}>
              Belum ada video tersimpan
            </div>
            <div style={{ fontSize: "14px", color: '#9ca3af' }}>
              Buat recording video baru untuk melihat daftar di sini
            </div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              background: '#ffffff',
              borderRadius: "12px 12px 0 0",
              border: '1px solid #e5e7eb',
              borderBottom: "none",
              overflow: "hidden"
            }}>
              <div style={{
                display: isMobile ? "none" : "grid",
                gridTemplateColumns: "120px 1fr 140px 100px 120px",
                gap: "12px",
                padding: "16px 20px",
                background: '#f9fafb',
                fontWeight: 500,
                color: '#6b7280',
                fontSize: "14px",
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  Thumbnail
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Judul
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Tanggal & Waktu
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Status
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Aksi
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div style={{
              background: '#ffffff',
              borderRadius: "0 0 12px 12px",
              border: '1px solid #e5e7eb',
              borderTop: "none",
              overflow: "hidden"
            }}>
              {paginatedRecordings.map((recording, index) => (
                <div
                  key={recording.id}
                  style={{
                    display: isMobile ? "block" : "grid",
                    gridTemplateColumns: "120px 1fr 140px 100px 120px",
                    gap: "12px",
                    padding: "16px 20px",
                    borderBottom: index < paginatedRecordings.length - 1 ? '1px solid #e5e7eb' : "none",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    display: isMobile ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "70px",
                    borderRadius: "8px",
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    <video
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                      muted
                      preload="metadata"
                      src={`${API_URL}/api/recording/download/${recording.filename}`}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = `
                          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af;">
                            <div style="font-size: 24px;">📹</div>
                          </div>
                        `;
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    minHeight: "70px",
                    padding: isMobile ? "0 0 12px 0" : "0"
                  }}>
                    <div style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: isMobile ? "4px" : "6px",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isMobile ? "normal" : "nowrap",
                    }}>
                      {recording.judul || recording.filename}
                    </div>
                    
                    {isMobile && (
                      <>
                        <div style={{ 
                          fontSize: "12px", 
                          color: '#9ca3af',
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}>
                          <span style={{ fontSize: "12px" }}>📅</span>
                          {new Date(recording.uploadedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div style={{
                    display: isMobile ? "none" : "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    fontSize: "13px",
                    color: '#6b7280',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: "2px" }}>
                      {new Date(recording.uploadedAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit", 
                        year: "numeric"
                      })}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: "11px" }}>
                      {new Date(recording.uploadedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{
                    display: isMobile ? "none" : "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                    <div style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 500,
                      background: '#d1fae5',
                      color: '#059669',
                    }}>
                      SAVED
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: "flex",
                    justifyContent: isMobile ? "flex-start" : "center",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}>
                    <button
                      onClick={() => handlePlayVideo(recording)}
                      style={{
                        padding: "8px",
                        background: '#ffffff',
                        color: '#10b981',
                        border: "1px solid #10b981",
                        borderRadius: 8,
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        transition: "all 0.2s ease",
                        flex: isMobile ? "1 1 auto" : "0 0 auto",
                        minWidth: isMobile ? "50px" : "40px",
                        height: "36px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#10b981';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#10b981';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-play" style={{ fontSize: "12px" }}></i>
                      {isMobile && "Play"}
                    </button>

                    <button
                      onClick={() => handleDeleteVideo(recording)}
                      style={{
                        padding: "8px",
                        background: '#ffffff',
                        color: '#ef4444',
                        border: "1px solid #ef4444",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                        fontSize: "12px",
                        fontWeight: 500,
                        flex: isMobile ? "1 1 auto" : "0 0 auto",
                        minWidth: isMobile ? "120px" : "40px",
                        height: "36px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <i className="fas fa-trash" style={{ fontSize: "12px" }}></i>
                      {isMobile && "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            padding: '16px 0',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Pagination Info */}
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: 500,
            }}>
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRecordings.length)} dari {filteredAndSortedRecordings.length} hasil
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                  color: currentPage === 1 ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  boxShadow: currentPage === 1 ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: `1px solid ${currentPage === 1 ? '#e5e7eb' : '#e5e7eb'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <i className="fas fa-chevron-left" style={{ fontSize: '12px' }}></i>
              </button>
              
              <div style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                {(() => {
                  const maxVisiblePages = 5;
                  const halfVisible = Math.floor(maxVisiblePages / 2);
                  let startPage = Math.max(1, currentPage - halfVisible);
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  const pages = [];
                  
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#6b7280',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        1
                      </button>
                    );
                    
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" style={{ color: '#9ca3af', fontSize: '14px' }}>
                          ...
                        </span>
                      );
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: currentPage === i ? '#d1fae5' : '#ffffff',
                          color: currentPage === i ? '#059669' : '#6b7280',
                          fontSize: '14px',
                          fontWeight: currentPage === i ? 600 : 500,
                          cursor: 'pointer',
                          boxShadow: currentPage === i ? '0 2px 4px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          border: `1px solid ${currentPage === i ? '#10b981' : '#e5e7eb'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== i) {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.color = '#374151';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== i) {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.color = '#6b7280';
                          }
                        }}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" style={{ color: '#9ca3af', fontSize: '14px' }}>
                          ...
                        </span>
                      );
                    }
                    
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#6b7280',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
                  color: currentPage === totalPages ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  boxShadow: currentPage === totalPages ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: `1px solid ${currentPage === totalPages ? '#e5e7eb' : '#e5e7eb'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <i className="fas fa-chevron-right" style={{ fontSize: '12px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {showVideoModal && selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: COLORS.white,
              borderRadius: 12,
              padding: "16px",
              maxWidth: "800px",
              maxHeight: "80vh",
              width: "90%",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseVideoModal}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: COLORS.red,
                color: COLORS.white,
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                zIndex: 1001,
              }}
            >
              ✕
            </button>

            {/* Video Title */}
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              {selectedVideo.judul || selectedVideo.filename}
            </h3>

            {/* Video Player */}
            <div
              style={{
                width: "100%",
                margin: "0 auto",
              }}
            >
              <video
                controls
                autoPlay
                style={{
                  width: "100%",
                  maxHeight: "400px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                }}
                src={`${API_URL}/api/recording/download/${selectedVideo.filename}`}
                onError={(e) => {
                  console.error("Video load error:", e);
                  alert("Gagal memuat video. Pastikan file video tersedia.");
                }}
              >
                Browser Anda tidak mendukung video player.
              </video>
            </div>

            {/* Video Info */}
            <div
              style={{
                marginTop: "12px",
                fontSize: "13px",
                color: COLORS.subtext,
              }}
            >
              <div>
                <strong>Tanggal:</strong> {formatDate(selectedVideo.uploadedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && videoToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: COLORS.white,
              borderRadius: 16,
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              position: "relative",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseDeleteModal}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                color: COLORS.subtext,
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                zIndex: 1001,
              }}
            >
              ✕
            </button>

            {/* Modal Content */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                Hapus Video?
              </h3>

              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "14px",
                  color: COLORS.subtext,
                  lineHeight: 1.5,
                }}
              >
                Apakah Anda yakin ingin menghapus video <strong>"{videoToDelete.judul || videoToDelete.filename}"</strong>? 
                <br />
                <br />
                Tindakan ini akan menghapus:
                <br />
                • Data video dari database
                <br />
                • File video
                <br />
                <br />
                <strong style={{ color: COLORS.red }}>Tindakan ini tidak dapat dibatalkan!</strong>
              </p>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                  style={{
                    padding: "12px 24px",
                    background: COLORS.border,
                    color: COLORS.text,
                    border: "none",
                    borderRadius: 8,
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.background = "#d1d5db";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.background = COLORS.border;
                    }
                  }}
                >
                  Batal
                </button>
                
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    padding: "12px 24px",
                    background: deleting ? COLORS.subtext : COLORS.red,
                    color: COLORS.white,
                    border: "none",
                    borderRadius: 8,
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                  }}
                >
                  {deleting ? (
                    <>
                      <span style={{ fontSize: "12px" }}>⏳</span>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "12px" }}>🗑️</span>
                      Ya, Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideoListPage;