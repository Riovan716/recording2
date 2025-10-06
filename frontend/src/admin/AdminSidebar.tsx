import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  sidebarBg: '#BBF7D0', // Light Green
  sidebarText: '#1E293B', // Dark Gray for better contrast
  sidebarActiveBg: '#86EFAC', // Darker Green
  sidebarActiveText: '#1E293B', // Dark Gray
  sidebarHoverBg: '#86EFAC', // Darker Green
  divider: '#86EFAC', // Darker Green
  logout: '#BBF7D0', // Light Green
  logoutText: '#1E293B', // Dark Gray
  icon: '#1E293B', // Dark Gray
  iconActive: '#BBF7D0', // Light Green
  logoText: '#1E293B', // Dark Gray
};

const menu = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: (
    // Analytics/Home icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/></svg>
  ) },
  { label: 'Live Stream', path: '/admin/dashboard/livestream', icon: (
    // Live streaming icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/></svg>
  ) },
  { label: 'History Live Stream', path: '/admin/dashboard/livestream-history', icon: (
    // History icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/><path d="M12 2l0 20"/></svg>
  ) },
  { label: 'Recording', path: '/admin/dashboard/recording', icon: (
    // Video recording icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  ) },
 
  { label: 'Daftar Video', path: '/admin/dashboard/videos', icon: (
    // Video list icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="8" r="1"/></svg>
  ) },
  { label: 'camera', path: '/admin/dashboard/camera-preview', icon: (
    // Camera preview icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="12" cy="10" r="3"/></svg>
  ) },
  { label: 'Profile', path: '/admin/dashboard/profile', icon: (
    // User profile icon
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ) },
];

const fontFamily = 'Inter, Segoe UI, Poppins, Arial, sans-serif';

const Tooltip: React.FC<{ text: string; show: boolean }> = ({ text, show }) => (
  <span style={{
    visibility: show ? 'visible' : 'hidden',
    opacity: show ? 1 : 0,
    position: 'absolute',
    left: 60,
    top: '50%',
    transform: 'translateY(-50%)',
    background: COLORS.sidebarBg,
    color: COLORS.sidebarText,
    fontSize: 13,
    borderRadius: 8,
    padding: '6px 12px',
    whiteSpace: 'nowrap',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(34,57,86,0.3)',
    transition: 'opacity 0.18s',
    pointerEvents: 'none',
  }}>{text}</span>
);

const AdminSidebar: React.FC<{ mobileOpen?: boolean; onMobileToggle?: () => void }> = ({ 
  mobileOpen = false, 
  onMobileToggle 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    // Set initial state based on screen size
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return width <= 1024; // Collapsed on mobile and tablet by default, expanded on desktop
    }
    return false; // Default to expanded on server-side
  });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  // Use external mobileOpen if provided, otherwise use internal state
  const currentMobileOpen = onMobileToggle ? mobileOpen : internalMobileOpen;
  const setCurrentMobileOpen = onMobileToggle ? 
    (open: boolean) => {
      // Always call onMobileToggle when setCurrentMobileOpen is called
      onMobileToggle();
    } : 
    setInternalMobileOpen;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newIsMobile = width <= 768;
      setIsMobile(newIsMobile);
      
      if (newIsMobile) {
        // Mobile: always collapsed, but don't change mobileOpen
        setCollapsed(true);
        // Don't change mobileOpen on resize
      } else if (width <= 1024) {
        // Tablet: collapsed by default, but can be expanded
        // Don't change mobileOpen on resize
      }
      // Desktop: no automatic changes, user controls everything
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMobileToggle = () => {
    setCurrentMobileOpen(!currentMobileOpen);
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setCurrentMobileOpen(false);
    }
  };

  // Mobile overlay - show when mobileOpen is true
  if (mobileOpen) {
    return (
      <>
        {/* Backdrop */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
          onClick={() => {
            setCurrentMobileOpen(false);
          }}
        />
        
        {/* Mobile Sidebar */}
        <aside style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 'auto',
          minWidth: 280,
          maxWidth: '85vw',
          height: '100vh',
          background: COLORS.sidebarBg,
          color: COLORS.sidebarText,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          fontFamily,
          zIndex: 10000,
          boxShadow: '2px 0 20px rgba(34,57,86,0.3)',
          overflow: 'hidden',
        }}>
          {/* Mobile Header */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            padding: '24px 24px 16px 24px',
            borderBottom: `1px solid ${COLORS.divider}`,
            background: COLORS.sidebarBg,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 8,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <button
                  aria-label="Close sidebar"
                  onClick={() => {
                    setCurrentMobileOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.icon,
                    borderRadius: '50%',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = COLORS.sidebarActiveBg;
                    e.currentTarget.style.color = COLORS.iconActive;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = COLORS.icon;
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <div>
                  <div style={{ 
                    fontSize: 12, 
                    color: COLORS.icon, 
                    margin: 0,
                    fontWeight: 500,
                    opacity: 0.8
                  }}>
                    Snap Room
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <nav style={{ flex: 1, width: '100%', padding: '16px 0' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {menu.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.label} style={{ 
                    marginBottom: 4, 
                    display: 'flex', 
                    justifyContent: 'flex-start', 
                    position: 'relative',
                    padding: '0 16px'
                  }}>
                    <button
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: 0,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isActive ? COLORS.sidebarActiveBg : 'transparent',
                        color: COLORS.sidebarText,
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 15,
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        fontFamily,
                        position: 'relative',
                        boxShadow: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      aria-label={item.label}
                      onClick={() => handleMenuClick(item.path)}
                    >
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginRight: 12,
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                      }}>
                        {React.cloneElement(item.icon, { 
                          stroke: COLORS.sidebarText, 
                          style: { transition: 'stroke 0.2s' } 
                        })}
                      </span>
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile Logout */}
          {user && (
            <div style={{ 
              width: '100%',
              padding: '16px 16px',
              borderTop: `1px solid ${COLORS.divider}`,
              background: COLORS.sidebarBg,
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 0,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: COLORS.sidebarText,
                  fontWeight: 600,
                  fontSize: 15,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  fontFamily,
                }}
                aria-label="Logout"
                onMouseOver={e => {
                  e.currentTarget.style.background = COLORS.sidebarHoverBg;
                  e.currentTarget.style.color = COLORS.sidebarActiveText;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = COLORS.sidebarText;
                }}
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginRight: 12,
                  width: 24,
                  height: 24,
                }}>
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7"/>
                    <rect x="3" y="5" width="8" height="14" rx="2"/>
                  </svg>
                </span>
                Logout
              </button>
            </div>
          )}
        </aside>
      </>
    );
  } else {
  }

  // Desktop/Tablet sidebar - always visible, can be collapsed
  // On mobile, don't render the desktop sidebar at all
  if (isMobile) {
    return null; // Don't render anything on mobile when overlay is not open
  }

  return (
    <aside style={{
      width: collapsed ? 70 : 'auto',
      minWidth: collapsed ? 70 : 280,
      maxWidth: collapsed ? 70 : 320,
      background: COLORS.sidebarBg,
      color: COLORS.sidebarText,
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      minHeight: '100vh',
      fontFamily,
      transition: 'width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease',
      alignItems: collapsed ? 'center' : 'stretch',
      justifyContent: 'space-between',
      boxShadow: '2px 0 20px rgba(34,57,86,0.15)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header with logo */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: collapsed ? '22px 0 12px 0' : '24px 24px 16px 24px',
        borderBottom: `1px solid ${COLORS.divider}`,
        background: COLORS.sidebarBg,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%',
          marginBottom: collapsed ? 0 : 8,
          gap: collapsed ? 0 : 14,
        }}>
          {/* Header content */}
          {collapsed ? (
            <button
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 10,
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.icon,
                borderRadius: '50%',
                transition: 'background 0.2s, color 0.2s',
                boxShadow: '0 2px 8px rgba(34,57,86,0.10)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = COLORS.sidebarActiveBg;
                e.currentTarget.style.color = COLORS.iconActive;
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = COLORS.icon;
              }}
            >
              {/* Hamburger icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="7" x2="19" y2="7" />
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="5" y1="17" x2="19" y2="17" />
              </svg>
            </button>
          ) : (
            <>
              {/* Hamburger di kiri */}
              <button
                aria-label="Collapse sidebar"
                onClick={() => setCollapsed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.icon,
                  borderRadius: '50%',
                  transition: 'background 0.2s, color 0.2s',
                  marginRight: 8,
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = COLORS.sidebarActiveBg;
                  e.currentTarget.style.color = COLORS.iconActive;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = COLORS.icon;
                }}
              >
                {/* Hamburger icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="7" x2="19" y2="7" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <line x1="5" y1="17" x2="19" y2="17" />
                </svg>
              </button>
              {/* Judul dan subtitle */}
              <div>
                <div style={{ 
                  fontSize: 20, 
                  color: COLORS.icon, 
                  margin: 0,
                  fontWeight: 1000,
                  opacity: 0.9
                }}>
                  Snap Room
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Menu utama */}
      <nav style={{ flex: 1, width: '100%', padding: '16px 0' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {menu.map((item, idx) => {
  const isActive = location.pathname === item.path;
  const isHovered = hoveredIdx === idx;
  return (
    <li key={item.label} style={{ 
      marginBottom: 4, 
      display: 'flex', 
      justifyContent: collapsed ? 'center' : 'flex-start', 
      position: 'relative',
      padding: collapsed ? '0 8px' : '0 16px'
    }}>
      <button
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 0,
          padding: collapsed ? '14px 0' : '14px 16px',
          borderRadius: 12,
          background: isActive ? COLORS.sidebarActiveBg : (isHovered ? COLORS.sidebarActiveBg : 'transparent'),
          color: COLORS.sidebarText,
          fontWeight: isActive ? 700 : (isHovered ? 600 : 500),
          fontSize: 15,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease',
          outline: 'none',
          fontFamily,
          position: 'relative',
          boxShadow: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        aria-label={item.label}
        onClick={() => handleMenuClick(item.path)}
        onMouseOver={() => setHoveredIdx(idx)}
        onMouseOut={() => setHoveredIdx(null)}
      >
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginRight: collapsed ? 0 : 12,
          width: 24,
          height: 24,
          flexShrink: 0,
        }}>
          {React.cloneElement(item.icon, { 
            stroke: COLORS.sidebarText, 
            style: { transition: 'stroke 0.2s' } 
          })}
        </span>
        {!collapsed && (
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.label}
          </span>
        )}
      </button>
      {collapsed && hoveredIdx === idx && (
        <Tooltip text={item.label} show={true} />
      )}
    </li>
  );
})}             
        </ul>
      </nav>

      {/* Logout section */}
      {user && (
        <div style={{ 
          width: '100%',
          padding: collapsed ? '16px 8px' : '16px 16px',
          borderTop: `1px solid ${COLORS.divider}`,
          background: COLORS.sidebarBg,
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 0,
              padding: collapsed ? '14px 0' : '14px 16px',
              borderRadius: 12,
              background: 'transparent',
              color: COLORS.sidebarText,
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily,
            }}
            aria-label="Logout"
            onMouseOver={e => {
              e.currentTarget.style.background = COLORS.sidebarHoverBg;
              e.currentTarget.style.color = COLORS.sidebarActiveText;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = COLORS.sidebarText;
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginRight: collapsed ? 0 : 12,
              width: 24,
              height: 24,
            }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7"/>
                <rect x="3" y="5" width="8" height="14" rx="2"/>
              </svg>
            </span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar; 