import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaVideo, FaBroadcastTower, FaEye } from 'react-icons/fa';
import { API_URL } from '../config';

interface Stats {
  totalRecordings: number;
  totalStreams: number;
  activeStreams: number;
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
  const [loading, setLoading] = useState(false);

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



  useEffect(() => {
    fetchStats();
  }, []);

  // Tanggal hari ini (format: Month D, YYYY)
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const todayFormatted = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  return (
    <div style={{ 
      padding: '32px 32px 32px 32px', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '40px',
        background: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        borderRadius: '20px',
        padding: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            margin: '0 0 12px 0',
            color: '#1e293b'
          }}>
            Dashboard Admin
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: '#1e293b', 
            margin: 0,
            fontWeight: 500,
            opacity: 0.8
          }}>
            Selamat datang kembali, {user?.name || 'Admin'}! • {todayFormatted}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #BBF7D0, #86EFAC)',
            borderRadius: '50%',
            opacity: 0.1
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #BBF7D0, #86EFAC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(187, 247, 208, 0.3)'
            }}>
              <FaVideo size={24} color="white" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
              {loading ? '...' : stats.totalRecordings}
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            Total Recording
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
            Video pembelajaran yang telah dibuat
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '50%',
            opacity: 0.1
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)'
            }}>
              <FaBroadcastTower size={24} color="white" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
              {loading ? '...' : stats.totalStreams}
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            Total Live Stream
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
            Sesi streaming yang telah dilakukan
          </div>
        </div>


        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #BBF7D0, #86EFAC)',
            borderRadius: '50%',
            opacity: 0.1
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #BBF7D0, #86EFAC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(187, 247, 208, 0.3)'
            }}>
              <FaEye size={24} color="white" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
              {loading ? '...' : stats.activeStreams}
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            Stream Aktif
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
            Streaming yang sedang berlangsung
          </div>
        </div>
      </div>


    </div>
  );
};

export default AdminDashboard;