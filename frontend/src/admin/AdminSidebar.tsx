import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  sidebarBg: '#FFFFFF', // White background
  sidebarText: '#64748B', // Gray text for inactive items
  sidebarActiveBg: '#F0FDF4', // Very light green background for active item
  sidebarActiveText: '#16A34A', // Softer green text for active item
  sidebarBorderActive: '#065F46', // Darker green for the active border line
  sidebarHoverBg: '#F8FAFC', // Light gray hover background
  divider: '#E2E8F0', // Light gray divider
  logout: '#FFFFFF', // White background
  logoutText: '#64748B', // Gray text
  icon: '#64748B', // Gray icons for inactive items
  iconActive: '#16A34A', // Softer green icons for active item
  logoText: '#1E293B', // Dark text for logo
};

const menu = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'fas fa-home' },
  { label: 'Live Stream', path: '/admin/dashboard/livestream', icon: 'fas fa-wifi' },
  { label: 'History', path: '/admin/dashboard/livestream-history', icon: 'fas fa-clock' },
  { label: 'Recording', path: '/admin/dashboard/recording', icon: 'fas fa-video' },
  { label: 'Daftar Video', path: '/admin/dashboard/videos', icon: 'fas fa-play-circle' },
  { label: 'Camera', path: '/admin/dashboard/camera-preview', icon: 'fas fa-camera' },
  { label: 'Profile', path: '/admin/dashboard/profile', icon: 'fas fa-user' },
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
                  <i className="fas fa-times" style={{ fontSize: '18px' }}></i>
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
                        color: isActive ? COLORS.sidebarActiveText : COLORS.sidebarText,
                        fontWeight: isActive ? 600 : 500,
                        borderLeft: isActive ? `4px solid ${COLORS.sidebarBorderActive}` : 'none',
                        paddingLeft: isActive ? '12px' : '16px',
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
                      onMouseOver={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = COLORS.sidebarHoverBg;
                        }
                      }}
                      onMouseOut={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginRight: 12,
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        color: isActive ? COLORS.iconActive : COLORS.icon,
                        transition: 'color 0.2s',
                      }}>
                        <i className={item.icon} style={{ fontSize: '16px' }}></i>
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
                  color: COLORS.logoutText,
                }}>
                  <i className="fas fa-sign-out-alt" style={{ fontSize: '16px' }}></i>
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
              <i className="fas fa-bars" style={{ fontSize: '20px' }}></i>
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
                <i className="fas fa-bars" style={{ fontSize: '20px' }}></i>
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
          padding: collapsed ? '14px 0' : (isActive ? '14px 12px 14px 12px' : '14px 16px'),
          borderRadius: 12,
          background: isActive ? COLORS.sidebarActiveBg : (isHovered ? COLORS.sidebarHoverBg : 'transparent'),
          color: isActive ? COLORS.sidebarActiveText : COLORS.sidebarText,
          fontWeight: isActive ? 600 : 500,
          borderLeft: isActive ? `4px solid ${COLORS.sidebarBorderActive}` : 'none',
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
          color: isActive ? COLORS.iconActive : COLORS.icon,
          transition: 'color 0.2s',
        }}>
          <i className={item.icon} style={{ fontSize: '16px' }}></i>
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
              color: COLORS.logoutText,
            }}>
              <i className="fas fa-sign-out-alt" style={{ fontSize: '16px' }}></i>
            </span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar; 