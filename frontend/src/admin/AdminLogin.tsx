import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// Import images using ES6 imports
import loginAdminImage from '../assets/loginadminn.png';
import umaloLogo from '../assets/umalo.png';

// Color palette - Light green theme
const LIGHT_GREEN = '#BBF7D0';
const SOFT_GREEN = '#DCFCE7';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user.role === 'admin') {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminData', JSON.stringify(data.user));
          login(data.user, data.token);
          navigate('/admin/dashboard');
        } else {
          setError('Akun ini bukan admin');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login gagal');
      }
    } catch (error) {
      setError('Terjadi kesalahan pada server');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      fontFamily: 'Poppins, Inter, Segoe UI, Arial, sans-serif',
      background: SOFT_GREEN,
    }}>
      {/* Welcome Section - Top on mobile, Right on desktop */}
      <div style={{
        flex: isMobile ? '1' : '2',
        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem',
        position: 'relative',
        overflow: 'hidden',
        minHeight: isMobile ? '50vh' : '100vh',
      }}>
        {/* Background wave shapes */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          opacity: '0.13',
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none">
            <path d="M0,300 Q200,200 400,300 T800,300 L800,600 L0,600 Z" fill={SOFT_GREEN}/>
            <path d="M0,400 Q200,300 400,400 T800,400 L800,600 L0,600 Z" fill={SOFT_GREEN} opacity="0.5"/>
          </svg>
        </div>
        <div style={{
          textAlign: 'center',
          zIndex: '1',
          position: 'relative',
        }}>
          <h2 style={{
            fontSize: isMobile ? '2rem' : '2.5rem',
            fontWeight: 'bold',
            color: SOFT_GREEN,
            marginBottom: '0.5rem',
            textAlign: 'center',
            letterSpacing: '-1px',
            transform: 'perspective(100px) rotateX(5deg)',
            transformOrigin: 'center',
          }}>
            Class Cast
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
          }}>
            <span style={{
              color: 'white',
              opacity: 1,
              fontSize: isMobile ? '1.5rem' : '1.5rem',
              textAlign: 'center',
            }}>
              powered by
            </span>
            <img 
              src={umaloLogo} 
              alt="Umalo Logo"
              style={{
                height: isMobile ? '1.2rem' : '1.4rem',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
          <div style={{
            position: 'relative',
            width: '80%',
            margin: '0 auto',
          }}>
            <img 
              src={loginAdminImage} 
              alt="Admin Login Illustration"
              style={{
                maxWidth: isMobile ? '80vw' : '100vw',
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                zIndex: 2,
                marginRight: '250px',
                position: 'relative',
                filter: `drop-shadow(0 4px 24px ${LIGHT_GREEN}44)`,
              }}
            />
          </div>
        </div>
      </div>
      {/* Login Form Section - Bottom on mobile, Left on desktop */}
      <div
        style={{
          flex: isMobile ? '1' : '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '1.5rem' : '2rem',
          background: '#fff',
          minHeight: isMobile ? '50vh' : '100vh',
        }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#fff',
          borderRadius: 18,
          boxShadow: `0 2px 16px ${LIGHT_GREEN}11`,
          border: `1.5px solid ${LIGHT_GREEN}22`,
          padding: isMobile ? '1.5rem 1rem' : '2.5rem 2rem',
        }}>
          <h1 style={{
            fontSize: isMobile ? '2rem' : '2.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '0.5rem',
            textAlign: 'center',
            letterSpacing: '-1px',
          }}>
            Login
          </h1>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem', width: '90%', maxWidth: 320, margin: '0 auto 1.5rem auto' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: 'none',
                  borderBottom: `2px solid ${LIGHT_GREEN}55`,
                  outline: 'none',
                  fontSize: '1rem',
                  backgroundColor: 'transparent',
                  color: '#1e293b',
                  transition: 'border 0.18s',
                }}
                onFocus={e => e.currentTarget.style.borderBottom = `2px solid ${LIGHT_GREEN}`}
                onBlur={e => e.currentTarget.style.borderBottom = `2px solid ${LIGHT_GREEN}55`}
              />
            </div>
            <div style={{ marginBottom: '1.5rem', position: 'relative', width: '90%', maxWidth: 320, margin: '0 auto 1.5rem auto' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: 'none',
                  borderBottom: `2px solid ${LIGHT_GREEN}55`,
                  outline: 'none',
                  fontSize: '1rem',
                  backgroundColor: 'transparent',
                  color: '#1e293b',
                  paddingRight: '2.5rem',
                  transition: 'border 0.18s',
                }}
                onFocus={e => e.currentTarget.style.borderBottom = `2px solid ${LIGHT_GREEN}`}
                onBlur={e => e.currentTarget.style.borderBottom = `2px solid ${LIGHT_GREEN}55`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: LIGHT_GREEN,
                  fontWeight: 600,
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  // Mata terbuka
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={LIGHT_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  // Mata tertutup
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={LIGHT_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </button>
            </div>
            {error && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: '10px 16px', marginBottom: 18, fontWeight: 600, fontSize: 15, textAlign: 'center' }}>{error}</div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                background: LIGHT_GREEN,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 17,
                padding: '15px 0',
                marginTop: 8,
                boxShadow: `0 2px 8px ${LIGHT_GREEN}11`,
                cursor: 'pointer',
                transition: 'background 0.18s, color 0.18s',
                letterSpacing: '0.1px',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = LIGHT_GREEN;
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = LIGHT_GREEN;
                e.currentTarget.style.color = '#fff';
              }}
            >
              Masuk
            </button>
          </form>
          
          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
          }}>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 