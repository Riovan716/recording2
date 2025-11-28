import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminLiveStreamPage from './AdminLiveStreamPage';
import AdminLiveStreamHistoryPage from './AdminLiveStreamHistoryPage';
import AdminRecordingPage from './AdminRecordingPage';
import AdminCameraPreviewPage from './AdminCameraPreviewPage';
import AdminProfilePage from './AdminProfilePage';
import { useAuth } from '../context/AuthContext';

// Color palette - Light green theme (#BBF7D0)
const LIGHT_GREEN = '#BBF7D0';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const SHADOW = '0 4px 24px rgba(187,247,208,0.12)';

const AdminPanel: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup timeout on unmount (must be before any conditional return)
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Set dropdown to show after 300ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      setShowProfileDropdown(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Set dropdown to hide after 200ms delay (gives time to move to dropdown)
    hoverTimeoutRef.current = setTimeout(() => {
      setShowProfileDropdown(false);
    }, 200);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={handleMobileToggle} />
      <div style={{ 
        flex: 1, 
        background: '#f6f8fa',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Top Bar */}
        <div style={{
          background: 'white',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0
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
          
          {/* Profile with Dropdown */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 16, 
              marginLeft: isMobile ? 0 : 'auto',
              position: 'relative'
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
           <span style={{
  width: 48,
  height: 48,
  background: '#10b981', // 🌟 MATCH DENGAN BANNER
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 20,
  border: '3px solid #ffffff',
  marginLeft: 8,
  userSelect: 'none',
  boxShadow: '0 6px 18px rgba(16,185,129,0.25)', // 🌟 soft shadow ala banner
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
}}>
  {initials}
</span>

            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div 
                style={{
                  position: 'absolute',
                  top: '60px',
                  right: 0,
                  background: WHITE,
                  borderRadius: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  padding: '16px',
                  minWidth: '240px',
                  zIndex: 1000,
                  border: '1px solid #e2e8f0'
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* Profile Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '16px' }}>
                  <span style={{
  width: 48,
  height: 48,
  background: '#10b981', // 🌟 SAME AS BANNER
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 20,
  border: '3px solid #059669', // 🌟 darker emerald, cocok dengan gradient banner
  userSelect: 'none',
  boxShadow: '0 6px 18px rgba(16,185,129,0.25)', // 🌟 emerald glow seperti banner
}}>
  {initials}
</span>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: GRAY_TEXT, fontSize: 16 }}>{displayName}</div>
                    <div style={{ fontSize: 13, color: GRAY_TEXT, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <i className="fas fa-user-circle" style={{ fontSize: 14 }}></i>
                      {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Profile Button */}
                <button
                  onClick={() => {
                    navigate('/admin/dashboard/profile');
                    setShowProfileDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    background: '#f1f5f9',
                    color: GRAY_TEXT,
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    marginBottom: '8px',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#e2e8f0';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                >
                  <i className="fas fa-user" style={{ fontSize: 14 }}></i>
                  Profile
                </button>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/';
                  }}
                  style={{
                    width: '100%',
                    background: '#ef4444',
                    color: WHITE,
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#dc2626';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <i className="fas fa-sign-out-alt" style={{ fontSize: 14 }}></i>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="livestream" element={<AdminLiveStreamPage />} />
            <Route path="livestream-history" element={<AdminLiveStreamHistoryPage />} />
            <Route path="recording" element={<AdminRecordingPage />} />
            <Route path="camera-preview" element={<AdminCameraPreviewPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 