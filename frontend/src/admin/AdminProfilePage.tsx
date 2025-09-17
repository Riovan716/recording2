import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ModalNotifikasi from '../components/ModalNotifikasi';
import { API_URL } from '../config';

// Color palette konsisten dengan AdminPanel
const VIBRANT_BLUE = '#2563EB';
const WHITE = '#fff';
const GRAY_TEXT = '#64748b';
const CARD_RADIUS = 18;
const SHADOW = '0 4px 24px rgba(37,99,235,0.08)';
const FONT_FAMILY = 'Poppins, Inter, Segoe UI, Arial, sans-serif';

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: VIBRANT_BLUE,
  primaryDark: '#1E40AF',
  accent: '#ef4444',
  accentDark: '#dc2626',
  text: '#1e293b',
  subtext: GRAY_TEXT,
  border: '#e5e7eb',
  bg: LIGHT_GRAY,
  white: WHITE,
  green: '#22c55e',
  greenDark: '#16a34a',
  red: '#ef4444',
  redDark: '#dc2626',
  yellow: '#facc15',
  yellowDark: '#eab308',
};

const AdminProfilePage: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const isMobile = windowWidth < 768;

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        })
      });

      if (response.ok) {
        showAlert('Profil berhasil diperbarui!', 'success');
        // Update user context if needed
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Gagal memperbarui profil', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Terjadi kesalahan saat memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showAlert('Password baru dan konfirmasi password tidak cocok', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      showAlert('Password baru harus minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/${user?.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (response.ok) {
        showAlert('Password berhasil diperbarui!', 'success');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Gagal memperbarui password', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('Terjadi kesalahan saat memperbarui password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Fungsi inisial nama
  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'A';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      background: COLORS.bg, 
      fontFamily: FONT_FAMILY,
      maxWidth: '100%',
      overflowX: 'hidden',
    }}>
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
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Profile Admin</div>
            <div style={{ fontSize: 16, opacity: 0.9 }}>
              Kelola informasi profil dan keamanan akun Anda
            </div>
          </div>
          <span style={{ height: 100, fontSize: 100, objectFit: 'contain', marginLeft: isMobile ? 0 : 32, marginTop: isMobile ? 18 : 0, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 4px 24px #0002)' }}>👤</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
          {/* Profile Information */}
          <div style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: '24px',
            boxShadow: SHADOW,
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.text, margin: '0 0 20px 0' }}>
              Informasi Profil
            </h2>

            {/* Profile Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: VIBRANT_BLUE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: WHITE,
                fontSize: '32px',
                fontWeight: 700,
                boxShadow: SHADOW,
              }}>
                {getInitials(user?.name || 'Admin')}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.text, marginBottom: '4px' }}>
                  {user?.name || 'Administrator'}
                </div>
                <div style={{ fontSize: '14px', color: COLORS.subtext }}>
                  {user?.email || 'admin@example.com'}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.primary, fontWeight: 600, marginTop: '4px' }}>
                  ADMIN
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#f1f5f9' : COLORS.primary,
                    color: loading ? COLORS.subtext : COLORS.white,
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Settings */}
          <div style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: CARD_RADIUS,
            padding: '24px',
            boxShadow: SHADOW,
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.text, margin: '0 0 20px 0' }}>
              Keamanan Akun
            </h2>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                    Password Baru
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.target.style.borderColor = COLORS.border}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#f1f5f9' : COLORS.green,
                    color: loading ? COLORS.subtext : COLORS.white,
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Mengubah...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

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
  );
};

export default AdminProfilePage;
