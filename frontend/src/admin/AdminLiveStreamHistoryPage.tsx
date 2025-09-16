import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

// Color palette konsisten dengan AdminPanel
const VIBRANT_BLUE = "#2563EB";
const SOFT_BLUE = "#DBEAFE";
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const CARD_RADIUS = 18;
const SHADOW = "0 4px 24px rgba(37,99,235,0.08)";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: VIBRANT_BLUE,
  primaryDark: "#1E40AF",
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
  const { user } = useAuth();
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'startTime' | 'duration' | 'viewers'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<LiveStream | null>(null);

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

  // Filter and sort data
  const filteredAndSortedHistory = liveStreamHistory
    .filter(stream => {
      if (filterStatus === 'all') return true;
      return stream.status === filterStatus;
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

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, 1fr)"
            : isTablet
            ? "repeat(3, 1fr)"
            : "repeat(5, 1fr)",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Total Streams */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: isMobile ? "16px" : "20px",
            boxShadow: SHADOW,
            textAlign: "center",
            gridColumn: isMobile ? "span 2" : "span 1",
          }}
        >
          {statsLoading ? (
            <div style={{ fontSize: "12px", color: COLORS.subtext }}>
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 700,
                  color: COLORS.primary,
                  marginBottom: "4px",
                }}
              >
                {streamingStats.totalStreams}
              </div>
              <div style={{ fontSize: "12px", color: COLORS.subtext }}>
                Total Siaran
              </div>
            </>
          )}
        </div>

        {/* Total Duration */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: isMobile ? "16px" : "20px",
            boxShadow: SHADOW,
            textAlign: "center",
          }}
        >
          {statsLoading ? (
            <div style={{ fontSize: "12px", color: COLORS.subtext }}>
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 700,
                  color: COLORS.blue,
                  marginBottom: "4px",
                }}
              >
                {formatDuration(streamingStats.totalDuration)}
              </div>
              <div style={{ fontSize: "12px", color: COLORS.subtext }}>
                Durasi Total
              </div>
            </>
          )}
        </div>

        {/* Total Viewers */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: isMobile ? "16px" : "20px",
            boxShadow: SHADOW,
            textAlign: "center",
          }}
        >
          {statsLoading ? (
            <div style={{ fontSize: "12px", color: COLORS.subtext }}>
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 700,
                  color: COLORS.green,
                  marginBottom: "4px",
                }}
              >
                {streamingStats.totalViewers}
              </div>
              <div style={{ fontSize: "12px", color: COLORS.subtext }}>
                Total Penonton
              </div>
            </>
          )}
        </div>

        {/* Active Streams */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: isMobile ? "16px" : "20px",
            boxShadow: SHADOW,
            textAlign: "center",
            display: isMobile ? "none" : "block",
          }}
        >
          {statsLoading ? (
            <div style={{ fontSize: "12px", color: COLORS.subtext }}>
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 700,
                  color: COLORS.red,
                  marginBottom: "4px",
                }}
              >
                {streamingStats.activeStreams}
              </div>
              <div style={{ fontSize: "12px", color: COLORS.subtext }}>
                Siaran Aktif
              </div>
            </>
          )}
        </div>

        {/* Average Viewers */}
        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: isMobile ? "16px" : "20px",
            boxShadow: SHADOW,
            textAlign: "center",
            display: isMobile ? "none" : "block",
          }}
        >
          {statsLoading ? (
            <div style={{ fontSize: "12px", color: COLORS.subtext }}>
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 700,
                  color: COLORS.yellow,
                  marginBottom: "4px",
                }}
              >
                {streamingStats.averageViewers}
              </div>
              <div style={{ fontSize: "12px", color: COLORS.subtext }}>
                Rata-rata Penonton
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: CARD_RADIUS,
          padding: isMobile ? "16px" : "20px",
          boxShadow: SHADOW,
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: COLORS.text,
            margin: "0 0 16px 0",
          }}
        >
          Filter & Urutkan
        </h3>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {/* Status Filter */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 500, color: COLORS.text, marginBottom: "8px", display: "block" }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'ended')}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: "14px",
                background: COLORS.white,
                color: COLORS.text,
              }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="ended">Selesai</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 500, color: COLORS.text, marginBottom: "8px", display: "block" }}>
              Urutkan Berdasarkan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'startTime' | 'duration' | 'viewers')}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: "14px",
                background: COLORS.white,
                color: COLORS.text,
              }}
            >
              <option value="startTime">Waktu Mulai</option>
              <option value="duration">Durasi</option>
              <option value="viewers">Jumlah Penonton</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: 500, color: COLORS.text, marginBottom: "8px", display: "block" }}>
              Urutan
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                fontSize: "14px",
                background: COLORS.white,
                color: COLORS.text,
              }}
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
        </div>
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
              color: COLORS.white,
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredAndSortedHistory.map((stream, index) => (
              <div
                key={stream.id}
                style={{
                  background: "#f8fafc",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "20px",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = COLORS.border;
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: COLORS.text,
                        marginBottom: "4px",
                      }}
                    >
                      {stream.title || `Live Stream #${stream.id}`}
                    </div>
                    <div style={{ fontSize: "14px", color: COLORS.subtext }}>
                      {stream.startTime && formatDate(stream.startTime)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        background: COLORS.blue,
                        color: COLORS.white,
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      💾 SAVED
                    </span>
                    <span
                      style={{
                        background: stream.status === 'active' ? COLORS.red : COLORS.green,
                        color: COLORS.white,
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      {stream.status === 'active' ? 'LIVE' : 'ENDED'}
                    </span>
                  </div>
                </div>
                
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                    gap: "16px",
                    fontSize: "14px",
                    color: COLORS.subtext,
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <strong>Durasi:</strong> {stream.duration ? formatDuration(stream.duration) : 'N/A'}
                  </div>
                  <div>
                    <strong>Penonton:</strong> {stream.viewers || 0}
                  </div>
                  <div>
                    <strong>ID Stream:</strong> {stream.id}
                  </div>
                </div>

                {/* Action Buttons */}
                {(stream.recordingPath || stream.isRecording) && (
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => handlePlayVideo(stream)}
                      style={{
                        padding: "8px 16px",
                        background: COLORS.primary,
                        color: COLORS.white,
                        border: "none",
                        borderRadius: 6,
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.primaryDark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = COLORS.primary;
                      }}
                    >
                      ▶️ Tonton
                    </button>
                    <button
                      onClick={() => {
                        // Download functionality
                        if (stream.recordingPath) {
                          window.open(`${API_URL}${stream.recordingPath}`, '_blank');
                        } else {
                          window.open(`${API_URL}/api/livestream/download/${stream.id}`, '_blank');
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        background: COLORS.green,
                        color: COLORS.white,
                        border: "none",
                        borderRadius: 6,
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.greenDark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = COLORS.green;
                      }}
                    >
                      📥 Download
                    </button>
                  </div>
                )}
                
                {stream.recordingPath && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      background: COLORS.green,
                      color: COLORS.white,
                      borderRadius: 6,
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    🎥 Recording tersedia: {stream.recordingPath}
                  </div>
                )}
              </div>
            ))}
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
              padding: "24px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              width: "100%",
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
                margin: "0 0 16px 0",
                fontSize: "18px",
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
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <video
                controls
                autoPlay
                style={{
                  width: "100%",
                  height: "auto",
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
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: "16px",
                fontSize: "14px",
                color: COLORS.subtext,
              }}
            >
              <div>
                <strong>Tanggal:</strong> {selectedVideo.startTime && formatDate(selectedVideo.startTime)}
              </div>
              <div>
                <strong>Durasi:</strong> {selectedVideo.duration ? formatDuration(selectedVideo.duration) : 'N/A'}
              </div>
              <div>
                <strong>Penonton:</strong> {selectedVideo.viewers || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveStreamHistoryPage;
