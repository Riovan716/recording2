import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaVideo, FaBroadcastTower, FaEye } from 'react-icons/fa';
import { API_URL } from '../config';

interface Stats {
  totalRecordings: number;
  totalStreams: number;
  activeStreams: number;
}

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


const COLORS = {
  primary: '#BBF7D0',
  green: '#22c55e',
  yellow: '#eab308',
  accent: '#BBF7D0',
  text: '#1e293b',
  subtext: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#BBF7D0',
};

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRecordings: 0,
    totalStreams: 0,
    activeStreams: 0,
  });
  const [liveStreamHistory, setLiveStreamHistory] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [recordingsRes, streamsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/recording`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ]);

      const recordings = recordingsRes.ok ? await recordingsRes.json() : [];
      const streams = streamsRes.ok ? await streamsRes.json() : { totalStreams: 0, totalDuration: 0 };
      const active = activeRes.ok ? await activeRes.json() : [];

      setStats({
        totalRecordings: Array.isArray(recordings) ? recordings.length : 0,
        totalStreams: streams.totalStreams || 0,
        activeStreams: Array.isArray(active) ? active.length : 0,
      });
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStreamHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/livestream/history?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLiveStreamHistory(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching live stream history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };



  useEffect(() => {
    fetchStats();
    fetchLiveStreamHistory();
  }, []);

  // Format tanggal untuk live stream history
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Tanggal hari ini (format: Month D, YYYY)
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const todayFormatted = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  // Responsive breakpoints
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      background: '#f8fafc', 
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px',
        color: '#1f2937',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#1f2937' }}>
              Selamat Datang Kembali, {user?.name || 'Admin'}! 👋
            </h1>
            <p style={{ fontSize: '14px', margin: 0, color: '#4b5563', lineHeight: '1.5', maxWidth: '500px' }}>
              Dashboard Anda menampilkan ringkasan lengkap aktivitas streaming dan konten terbaru.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>
            <i className="fas fa-video"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Recording</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              {loading ? '...' : stats.totalRecordings}
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>
            <i className="fas fa-wifi"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Stream</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              {loading ? '...' : stats.totalStreams}
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>
            <i className="fas fa-eye"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Active Now</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              {loading ? '...' : stats.activeStreams}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: isMobile ? '16px' : '32px',
      }}>
        {/* Left Column */}
        <div>
          {/* Live Stream History */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}>
            <div style={{
              padding: '24px 24px 0 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <i className="fas fa-history"></i>
                Live Stream History
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                display: isMobile ? 'none' : 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '16px',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <div>Judul</div>
                <div>Tanggal</div>
            
              </div>
              {historyLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '20px',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  Memuat history...
                </div>
              ) : liveStreamHistory.length === 0 ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '20px',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  Belum ada live stream history
                </div>
              ) : (
                liveStreamHistory.map((stream, index) => (
                  <div key={stream.id} style={{
                    display: isMobile ? 'block' : 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '16px',
                    padding: isMobile ? '16px 0' : '12px 0',
                    borderBottom: index < liveStreamHistory.length - 1 ? '1px solid #f1f5f9' : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#1e293b', 
                      fontWeight: 500,
                      marginBottom: isMobile ? '8px' : '0'
                    }}>
                      {stream.title || `Live Stream #${stream.id}`}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#64748b',
                      marginBottom: isMobile ? '8px' : '0'
                    }}>
                      {stream.startTime ? formatDate(stream.startTime) : '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;