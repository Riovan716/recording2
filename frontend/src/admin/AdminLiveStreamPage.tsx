import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStreaming } from "../context/StreamingContext";
import CameraPreview from "./CameraPreview";
import ModalNotifikasi from "../components/ModalNotifikasi";
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




interface StreamingStats {
  totalStreams: number;
  totalDuration: number; // in hours
  totalViewers: number;
  activeStreams: number;
  averageViewers: number;
}

const AdminLiveStreamPage: React.FC = () => {
  const { user, token } = useAuth();
  const { streamingState, startStream, stopStream, updateStatus, setSelectedKelas, setSelectedMapel } = useStreaming();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const webSocket = useRef<WebSocket | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    totalStreams: 0,
    totalDuration: 0,
    totalViewers: 0,
    activeStreams: 0,
    averageViewers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;



  // Fetch streaming statistics
  const fetchStreamingStats = async () => {
    try {
      setStatsLoading(true);

      // Fetch from backend API
      const [statsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/livestream/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
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
      // Jangan gunakan data mock, tampilkan nilai 0 saja
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




  // Real-time stats updates
  useEffect(() => {
    fetchStreamingStats();

    const interval = setInterval(() => {
      fetchStreamingStats();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Initial data loading if needed
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const handleStartStream = () => {
    setShowTitleModal(true);
  };

  const handleConfirmStartStream = async () => {
    if (!streamTitle.trim()) {
      showAlert("Judul live stream harus diisi!", "warning");
      return;
    }

    try {
      setShowTitleModal(false);
      
      // Start stream with title
      await startStream("admin", streamTitle);
      
      // Update stats immediately
      await fetchStreamingStats();
      
      showAlert("Live stream berhasil dimulai!", "success");
      setStreamTitle('');
    } catch (error) {
      console.error("Error starting stream:", error);
      showAlert((error as Error).message || "Error memulai streaming", "error");
    }
  };


  const handleStopStream = async () => {
    try {
      await stopStream();
      
      // Update stats
      await fetchStreamingStats();
    } catch (error) {
      console.error("Error stopping stream:", error);
    }
  };



  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours}j`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}h ${remainingHours}j`;
  };

  // Helper function to generate stream URL
  const generateStreamUrl = (roomId: string) => {
    // Always use HTTP server to avoid CORS issues
    return `http://localhost:3000/#/view/${roomId}`;
  };

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
            Menyiapkan data live streaming
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Add CSS animations */}
      <style>
        {`
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(30px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInRight {
            0% {
              opacity: 0;
              transform: translateX(30px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes scaleIn {
            0% {
              opacity: 0;
              transform: scale(0.9);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
      
      <div
        style={{
          padding: isMobile ? "16px" : "32px",
          maxWidth: "100%",
          overflowX: "hidden",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
        }}
      >
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
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Live Streaming</div>
            <div style={{ fontSize: 16, opacity: 0.9 }}>
              Selamat datang, {user?.name || 'Admin'}! Mulai live streaming pembelajaran dengan mudah.
            </div>
          </div>
          <span style={{ height: 100, fontSize: 100, objectFit: 'contain', marginLeft: isMobile ? 0 : 32, marginTop: isMobile ? 18 : 0, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 4px 24px #0002)' }}>📺</span>
        </div>

        {/* Stats Cards */}
         <div
           style={{
             display: "grid",
             gridTemplateColumns: isMobile
               ? "repeat(2, 1fr)"
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
          }}
        >
          {/* Main Content */}
          <div
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: CARD_RADIUS,
              padding: isMobile ? "16px" : "24px",
              boxShadow: SHADOW,
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: COLORS.text,
                margin: "0 0 16px 0",
              }}
            >
              Kontrol Live Streaming
            </h2>

            {!streamingState.isStreaming ? (
              <>
                {/* Start Button */}
                <button
                  onClick={handleStartStream}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: COLORS.primary,
                    color: COLORS.white,
                    border: "none",
                    borderRadius: 6,
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  📡 Mulai Live Stream
                </button>
              </>
            ) : (
              <>
                {/* Camera Preview */}
                {streamingState.isStreaming && streamingState.localStream && (
                  <div style={{ 
                    marginBottom: "16px",
                    animation: "fadeInUp 0.6s ease-out"
                  }}>
                    <CameraPreview 
                      stream={streamingState.localStream} 
                      isStreaming={streamingState.isStreaming}
                      streamTitle="Admin Live Stream"
                      viewerCount={0}
                      fullScreen={false}
                    />
                  </div>
                )}

                {/* Enhanced Status Info */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    border: `1px solid ${COLORS.primary}`,
                    borderRadius: 12,
                    padding: "16px",
                    marginBottom: "16px",
                    position: "relative",
                    overflow: "hidden",
                    animation: "slideInRight 0.5s ease-out 0.2s both"
                  }}
                >
                  {/* Background Pattern */}
                  <div style={{
                    position: "absolute",
                    top: "-20px",
                    right: "-20px",
                    width: "80px",
                    height: "80px",
                    background: "radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)",
                    borderRadius: "50%"
                  }} />
                  
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <div style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: COLORS.green,
                        animation: "pulse 2s infinite"
                      }} />
                      <span style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: COLORS.text
                      }}>
                        Live Streaming Aktif
                      </span>
                    </div>
                    <div style={{
                      background: COLORS.green,
                      color: COLORS.white,
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      ONLINE
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: "13px",
                    color: COLORS.subtext,
                    marginBottom: "4px"
                  }}>
                    📺 Admin Live Stream
                  </div>
                  
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "8px" : "16px",
                    fontSize: "12px",
                    color: COLORS.subtext,
                    flexWrap: isMobile ? "wrap" : "nowrap"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: isMobile ? "4px" : "0"
                    }}>
                      <span>👥</span>
                      <span>0 penonton</span>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: isMobile ? "4px" : "0"
                    }}>
                      <span>📡</span>
                      <span>HD Quality</span>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>⏱️</span>
                      <span>Dimulai: {new Date().toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Share Link Section */}
                {streamingState.isStreaming && streamingState.roomId && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                      border: `2px solid ${COLORS.primary}`,
                      borderRadius: 16,
                      padding: "20px",
                      marginBottom: "16px",
                      position: "relative",
                      overflow: "hidden",
                      animation: "scaleIn 0.6s ease-out 0.4s both"
                    }}
                  >
                    {/* Background Pattern */}
                    <div style={{
                      position: "absolute",
                      top: "-30px",
                      left: "-30px",
                      width: "100px",
                      height: "100px",
                      background: "radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)",
                      borderRadius: "50%"
                    }} />
                    
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: COLORS.primary,
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        position: "relative",
                        zIndex: 1
                      }}
                    >
                      🔗 Bagikan Live Stream
                    </div>
                    
                    <div
                      style={{
                        background: COLORS.white,
                        border: `2px solid ${COLORS.border}`,
                        borderRadius: 12,
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: COLORS.text,
                        marginBottom: "16px",
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        position: "relative",
                        zIndex: 1,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
                      }}
                    >
                      {generateStreamUrl(streamingState.roomId)}
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      gap: "12px",
                      position: "relative",
                      zIndex: 1,
                      flexDirection: isMobile ? "column" : "row"
                    }}>
                      <button
                        onClick={() => {
                          try {
                            if (!streamingState.roomId) {
                              showAlert("Room ID tidak tersedia. Silakan coba lagi.", "error");
                              return;
                            }
                            const link = generateStreamUrl(streamingState.roomId);
                            window.open(link, '_blank');
                            showAlert("Preview dibuka di tab baru!", "success");
                          } catch (error) {
                            console.error('Error opening preview:', error);
                            showAlert("Gagal membuka preview. Silakan coba lagi.", "error");
                          }
                        }}
                        style={{
                          flex: 1,
                          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                          color: COLORS.white,
                          border: "none",
                          borderRadius: 10,
                          padding: "12px 16px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.2s ease",
                          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                        }}
                      >
                        👁️ Buka Preview
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (!streamingState.roomId) {
                              showAlert("Room ID tidak tersedia. Silakan coba lagi.", "error");
                              return;
                            }
                            const link = generateStreamUrl(streamingState.roomId);
                            
                            // Try modern clipboard API first
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(link);
                              showAlert("Link berhasil disalin ke clipboard!", "success");
                            } else {
                              // Fallback for older browsers or non-secure contexts
                              const textArea = document.createElement('textarea');
                              textArea.value = link;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              textArea.style.top = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              
                              try {
                                const successful = document.execCommand('copy');
                                if (successful) {
                                  showAlert("Link berhasil disalin ke clipboard!", "success");
                                } else {
                                  throw new Error('Copy command failed');
                                }
                              } catch (err) {
                                // Show the link in a modal if clipboard fails
                                showAlert(`Gagal menyalin ke clipboard. Silakan salin manual: ${link}`, "warning");
                              } finally {
                                document.body.removeChild(textArea);
                              }
                            }
                          } catch (error) {
                            console.error('Error copying to clipboard:', error);
                            showAlert("Gagal menyalin link ke clipboard. Silakan coba lagi.", "error");
                          }
                        }}
                        style={{
                          flex: 1,
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: COLORS.white,
                          border: "none",
                          borderRadius: 10,
                          padding: "12px 16px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.2s ease",
                          boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)"
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(34, 197, 94, 0.4)";
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3)";
                        }}
                      >
                        📋 Salin Link
                      </button>
                    </div>
                  </div>
                )}

                {/* Enhanced Stop Button */}
                <button
                  onClick={handleStopStream}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: COLORS.white,
                    border: "none",
                    borderRadius: 12,
                    padding: "16px 20px",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.3)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.3)";
                  }}
                >
                  {/* Background Pattern */}
                  <div style={{
                    position: "absolute",
                    top: "-20px",
                    right: "-20px",
                    width: "60px",
                    height: "60px",
                    background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                    borderRadius: "50%"
                  }} />
                  
                  <span style={{ fontSize: "18px" }}>⏹️</span>
                  <span style={{ position: "relative", zIndex: 1 }}>Hentikan Live Stream</span>
                </button>
              </>
            )}
          </div>
        </div>


      {/* Modal Input Judul */}
      {showTitleModal && (
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
              Masukkan Judul Live Stream
            </h3>
            
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#64748b'
            }}>
              Berikan judul yang deskriptif untuk live stream Anda.
            </p>

            <input
              type="text"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
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
                  handleConfirmStartStream();
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
                  setShowTitleModal(false);
                  setStreamTitle('');
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
                onClick={handleConfirmStartStream}
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
                Mulai Live Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifikasi */}
      <ModalNotifikasi
        isOpen={showAlertModal}
        title="Pemberitahuan"
        message={alertMessage}
        type={alertType}
        onConfirm={() => setShowAlertModal(false)}
        onCancel={() => setShowAlertModal(false)}
        confirmText="OK"
        cancelText=""
        />
      </div>
    </>
  );
};

export default AdminLiveStreamPage;
