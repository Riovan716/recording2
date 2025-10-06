import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FaSearch, FaCalendar } from "react-icons/fa";
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

interface LiveStream {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  viewers?: number;
  isRecording?: boolean;
  recordingPath?: string;
  status?: 'active' | 'ended' | 'recording';
}

interface StreamingStats {
  totalStreams: number;
  totalDuration: number; // in hours
  totalViewers: number;
  activeStreams: number;
  averageViewers: number;
}

const AdminLiveStreamHistoryPage: React.FC = () => {
  const { user, token } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [liveStreamHistory, setLiveStreamHistory] = useState<LiveStream[]>([]);
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    totalStreams: 0,
    totalDuration: 0,
    totalViewers: 0,
    activeStreams: 0,
    averageViewers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'startTime' | 'duration' | 'viewers'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<LiveStream | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<LiveStream | null>(null);
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

  // Fetch streaming statistics
  const fetchStreamingStats = async () => {
    try {
      setStatsLoading(true);

      // Fetch from backend API
      const [statsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/livestream/stats`),
        fetch(`${API_URL}/api/livestream/active`),
      ]);

      let stats = {
        totalStreams: 0,
        totalDuration: 0,
        totalViewers: 0,
        activeStreams: 0,
        averageViewers: 0,
      };

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        stats = {
          totalStreams: statsData.totalStreams || 0,
          totalDuration: statsData.totalDuration || 0,
          totalViewers: statsData.totalViewers || 0,
          activeStreams: statsData.activeStreams || 0,
          averageViewers: statsData.averageViewers || 0,
        };
      }

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        stats.activeStreams = activeData.length || 0;
      }

      setStreamingStats(stats);
    } catch (error) {
      console.error("Error fetching streaming stats:", error);
      setStreamingStats({
        totalStreams: 0,
        totalDuration: 0,
        totalViewers: 0,
        activeStreams: 0,
        averageViewers: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch live stream history
  const fetchLiveStreamHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/livestream/history`);
      if (response.ok) {
        const data = await response.json();
        setLiveStreamHistory(data.data || []);
        console.log('Live stream history loaded:', data.data);
      }
    } catch (error) {
      console.error("Error fetching live stream history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time stats updates
  useEffect(() => {
    fetchStreamingStats();
    fetchLiveStreamHistory();

    const interval = setInterval(() => {
      fetchStreamingStats();
      fetchLiveStreamHistory();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
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

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}j`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}h ${remainingHours.toFixed(1)}j`;
  };

  const handlePlayVideo = (stream: LiveStream) => {
    setSelectedVideo(stream);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteStream = (stream: LiveStream) => {
    setStreamToDelete(stream);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setStreamToDelete(null);
  };

  const confirmDelete = async () => {
    if (!streamToDelete) return;
    
    try {
      setDeleting(true);
      if (!token) {
        alert('Anda harus login untuk menghapus live stream');
        return;
      }
      
      console.log('Sending DELETE request to:', `${API_URL}/api/livestream/${streamToDelete.id}`);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${API_URL}/api/livestream/${streamToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        // Remove from local state
        setLiveStreamHistory(prev => prev.filter(stream => stream.id !== streamToDelete.id));
        
        // Update stats
        setStreamingStats(prev => ({
          ...prev,
          totalStreams: prev.totalStreams - 1,
        }));
        
        setShowDeleteModal(false);
        setStreamToDelete(null);
      } else {
        const errorData = await response.json();
        alert(`Gagal menghapus live stream: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting live stream:', error);
      alert('Gagal menghapus live stream. Silakan coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedHistory = liveStreamHistory
    .filter(stream => {
      // Search term filter
      const searchMatch = !searchTerm || 
        (stream.title && stream.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stream.id && stream.id.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Date filter
      const dateMatch = !filterDate || 
        (stream.startTime && new Date(stream.startTime).toDateString() === new Date(filterDate).toDateString());
      
      return searchMatch && dateMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'startTime':
          aValue = new Date(a.startTime || 0).getTime();
          bValue = new Date(b.startTime || 0).getTime();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'viewers':
          aValue = a.viewers || 0;
          bValue = b.viewers || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = filteredAndSortedHistory.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{ textAlign: "center", color: COLORS.subtext }}>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>
            Memuat...
          </div>
          <div style={{ fontSize: "14px" }}>
            Menyiapkan data history live streaming
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
        background: COLORS.bg,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Header */}
      <div style={{
        background: LIGHT_GREEN,
        borderRadius: CARD_RADIUS,
        color: '#1e293b',
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
          <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 8 }}>
            {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            History Live Streaming
          </div>
          <div style={{ fontSize: 16, opacity: 0.9 }}>
            Selamat datang, {user?.name || 'Admin'}! Lihat riwayat live streaming yang telah dilakukan.
          </div>
        </div>
        <span style={{ 
          height: 100, 
          fontSize: 100, 
          objectFit: 'contain', 
          marginLeft: isMobile ? 0 : 32, 
          marginTop: isMobile ? 18 : 0, 
          display: 'flex', 
          alignItems: 'center', 
          filter: 'drop-shadow(0 4px 24px #0002)' 
        }}>
          📊
        </span>
      </div>

      {/* History List */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: CARD_RADIUS,
          padding: isMobile ? "16px" : "20px",
          boxShadow: SHADOW,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: COLORS.text,
              margin: 0,
            }}
          >
            History Live Streaming ({filteredAndSortedHistory.length})
          </h3>
          
          <button
            onClick={() => {
              fetchLiveStreamHistory();
              fetchStreamingStats();
            }}
            style={{
              padding: "8px 16px",
              background: COLORS.primary,
              color: "black",
              border: "none",
              borderRadius: 6,
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🔄 Refresh
          </button>
        </div>
        
        {/* Search and Filter Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '16px',
          background: COLORS.white,
          borderRadius: CARD_RADIUS,
          boxShadow: SHADOW,
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
              color: COLORS.subtext,
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder="Cari berdasarkan judul atau ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
                background: COLORS.white,
                color: COLORS.text
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
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
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                background: COLORS.white,
                color: COLORS.text,
                cursor: 'pointer'
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>
        </div>
        
        {filteredAndSortedHistory.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: COLORS.subtext,
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📺</div>
            <div style={{ fontSize: "18px", fontWeight: 500, marginBottom: "8px" }}>
              Belum ada history live streaming
            </div>
            <div style={{ fontSize: "14px" }}>
              Mulai live streaming untuk melihat history di sini
            </div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              background: COLORS.white,
              borderRadius: "12px 12px 0 0",
              border: `1px solid ${COLORS.border}`,
              borderBottom: "none",
              overflow: "hidden"
            }}>
              <div style={{
                display: isMobile ? "none" : "grid",
                gridTemplateColumns: "120px 1fr 140px 100px",
                gap: "12px",
                padding: "16px 20px",
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                fontWeight: 600,
                color: COLORS.text,
                fontSize: "14px",
                borderBottom: `1px solid ${COLORS.border}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  Thumbnail
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Title
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Date & Time
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  Actions
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div style={{
              background: COLORS.white,
              borderRadius: "0 0 12px 12px",
              border: `1px solid ${COLORS.border}`,
              borderTop: "none",
              overflow: "hidden"
            }}>
              {paginatedHistory.map((stream, index) => (
                <div
                  key={stream.id}
                  style={{
                    display: isMobile ? "block" : "grid",
                    gridTemplateColumns: "120px 1fr 140px 100px",
                    gap: "12px",
                    padding: "16px 20px",
                    borderBottom: index < paginatedHistory.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Thumbnail for Desktop */}
                  <div style={{
                    display: isMobile ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "70px",
                    borderRadius: "8px",
                    background: `linear-gradient(135deg, rgba(187, 247, 208, 0.1) 0%, rgba(134, 239, 172, 0.05) 100%)`,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {stream.recordingPath ? (
                      <video
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                        muted
                        preload="metadata"
                        src={`${API_URL}${stream.recordingPath}`}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement!.innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: ${COLORS.subtext};">
                              <div style="font-size: 24px;">📹</div>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: COLORS.subtext 
                      }}>
                        <span style={{ fontSize: "24px" }}>🎥</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: stream.status === 'active' 
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: COLORS.white,
                        fontSize: "9px",
                        padding: "2px 6px",
                        borderRadius: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                        boxShadow: stream.status === 'active' 
                          ? '0 2px 6px rgba(239, 68, 68, 0.4)' 
                          : '0 2px 6px rgba(34, 197, 94, 0.4)',
                      }}
                    >
                      {stream.status === 'active' ? 'LIVE' : 'SAVED'}
                    </div>
                  </div>

                  {/* Title & Info */}
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
                      fontSize: "16px",
                      fontWeight: 700,
                      color: COLORS.text,
                      marginBottom: isMobile ? "4px" : "6px",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isMobile ? "normal" : "nowrap",
                    }}>
                      {stream.title || `Live Stream #${stream.id}`}
                    </div>
                    
                    {isMobile && (
                      <>
                        <div style={{ 
                          fontSize: "12px", 
                          color: COLORS.subtext,
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}>
                          <span style={{ fontSize: "12px" }}>📅</span>
                          {stream.startTime && new Date(stream.startTime).toLocaleDateString("id-ID", {
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
                    color: COLORS.text,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                      {stream.startTime && new Date(stream.startTime).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit", 
                        year: "numeric"
                      })}
                    </div>
                    <div style={{ color: COLORS.subtext, fontSize: "11px" }}>
                      {stream.startTime && new Date(stream.startTime).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
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
                      onClick={() => handlePlayVideo(stream)}
                      style={{
                        padding: isMobile ? "8px 12px" : "6px 10px",
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: COLORS.white,
                        border: "none",
                        borderRadius: isMobile ? 12 : 6,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        transition: "all 0.3s ease",
                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)',
                        flex: isMobile ? "1 1 auto" : "0 0 auto",
                        minWidth: isMobile ? "50px" : "50px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(34, 197, 94, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(34, 197, 94, 0.3)';
                      }}
                    >
                      <span style={{ fontSize: "12px" }}>▶</span>
                      {isMobile && "Play"}
                    </button>

                    <button
                      onClick={() => handleDeleteStream(stream)}
                      style={{
                        padding: isMobile ? "8px 12px" : "6px 10px",
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: COLORS.white,
                        border: "none",
                        borderRadius: isMobile ? 12 : 6,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.3s ease",
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                        fontSize: "12px",
                        fontWeight: 600,
                        flex: isMobile ? "1 1 auto" : "0 0 auto",
                        minWidth: isMobile ? "120px" : "50px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.3)';
                      }}
                    >
                      <span style={{ fontSize: "12px" }}>🗑</span>
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
                background: currentPage === 1 ? '#f3f4f6' : COLORS.white,
                color: currentPage === 1 ? COLORS.subtext : '#1e293b',
                fontSize: '16px',
                fontWeight: 500,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                boxShadow: currentPage === 1 ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                border: `1px solid ${COLORS.border}`,
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
                    background: currentPage === page ? COLORS.primary : COLORS.white,
                    color: currentPage === page ? '#1e293b' : COLORS.subtext,
                    fontSize: '14px',
                    fontWeight: currentPage === page ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: currentPage === page ? '0 2px 8px rgba(187, 247, 208, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${currentPage === page ? COLORS.primary : COLORS.border}`,
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
                background: currentPage === totalPages ? '#f3f4f6' : COLORS.white,
                color: currentPage === totalPages ? COLORS.subtext : '#1e293b',
                fontSize: '16px',
                fontWeight: 500,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                boxShadow: currentPage === totalPages ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              →
            </button>
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
              {selectedVideo.title || `Live Stream #${selectedVideo.id}`}
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
                src={selectedVideo.recordingPath ? `${API_URL}${selectedVideo.recordingPath}` : `${API_URL}/api/livestream/stream/${selectedVideo.id}`}
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
                <strong>Tanggal:</strong> {selectedVideo.startTime && formatDate(selectedVideo.startTime)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && streamToDelete && (
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
                Hapus Live Stream?
              </h3>

              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "14px",
                  color: COLORS.subtext,
                  lineHeight: 1.5,
                }}
              >
                Apakah Anda yakin ingin menghapus live stream <strong>"{streamToDelete.title || `Live Stream #${streamToDelete.id}`}"</strong>? 
                <br />
                <br />
                Tindakan ini akan menghapus:
                <br />
                • Data live stream dari database
                <br />
                • File recording (jika ada)
                <br />
                • Thumbnail (jika ada)
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

export default AdminLiveStreamHistoryPage;
