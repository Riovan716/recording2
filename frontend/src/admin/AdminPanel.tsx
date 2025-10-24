import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminLiveStreamPage from './AdminLiveStreamPage';
import AdminLiveStreamHistoryPage from './AdminLiveStreamHistoryPage';
import AdminRecordingPage from './AdminRecordingPage';
import AdminCameraPreviewPage from './AdminCameraPreviewPage';
import AdminVideoListPage from './AdminVideoListPage';
import AdminProfilePage from './AdminProfilePage';
import { useAuth } from '../context/AuthContext';

// Color palette - Light green theme (#BBF7D0)
const LIGHT_GREEN = '#BBF7D0';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const SHADOW = '0 4px 24px rgba(187,247,208,0.12)';

const AdminPanel: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 768;
      setIsMobile(newIsMobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f6f8fa'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div style={{ color: '#64748b', fontSize: '16px' }}>Loading...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Fungsi inisial nama
  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'A';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(user?.name || 'Admin');
  const displayName = user?.name || 'Administrator';
  const displayRole = user?.role || 'admin';

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={handleMobileToggle} />
      <div style={{ flex: 1, background: '#f6f8fa' }}>
        {/* Top Bar */}
        <div style={{
          background: 'white',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Mobile Hamburger Button - Always show on mobile for testing */}
          <button
            onClick={handleMobileToggle}
            style={{
              background: isMobile ? '#f1f5f9' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: GRAY_TEXT,
              borderRadius: '50%',
              transition: 'background 0.2s, color 0.2s',
              visibility: isMobile ? 'visible' : 'hidden',
              minWidth: '40px',
              minHeight: '40px',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = isMobile ? '#f1f5f9' : 'transparent';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="7" x2="19" y2="7" />
              <line x1="5" y1="12" x2="19" y2="12" />
              <line x1="5" y1="17" x2="19" y2="17" />
            </svg>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: isMobile ? 0 : 'auto' }}>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              <div style={{ fontWeight: 700, color: GRAY_TEXT }}>{displayName}</div>
              <div style={{ fontSize: 14, color: GRAY_TEXT, opacity: 0.7 }}>{displayRole}</div>
            </div>
            <span style={{
              width: 48,
              height: 48,
              background: LIGHT_GREEN,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 20,
              border: `3px solid ${WHITE}`,
              marginLeft: 8,
              userSelect: 'none',
              boxShadow: SHADOW,
            }}>
              {initials}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="livestream" element={<AdminLiveStreamPage />} />
          <Route path="livestream-history" element={<AdminLiveStreamHistoryPage />} />
          <Route path="recording" element={<AdminRecordingPage />} />
          <Route path="camera-preview" element={<AdminCameraPreviewPage />} />
          <Route path="videos" element={<AdminVideoListPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPanel; 