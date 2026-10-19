import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { assets } from '../../assets/assets';

const Navbar = () => {
  const [adminUser, setAdminUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch {
        // fallback
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  return (
    <div
      className="navbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 4%',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <a href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img className="logo" src={assets.logo} alt="Tomato Logo" style={{ width: 'max(10%, 95px)' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: '#7c3aed',
              color: '#ffffff',
              padding: '2px 7px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}
          >
            ADMIN WORKSPACE
          </span>
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Admin Role Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            padding: '5px 12px',
            borderRadius: '20px'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6d28d9' }}>
            👑 Admin: {adminUser?.name || 'Manager'}
          </span>
        </div>

        <a
          href="/"
          style={{
            textDecoration: 'none',
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            border: '1px solid #cbd5e1',
            padding: '6px 12px',
            borderRadius: '20px',
            background: '#ffffff'
          }}
        >
          🌐 Customer Store
        </a>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: '#ffffff',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>

        <img
          className="profile"
          src={assets.profile_image}
          alt="User profile"
          style={{ width: '36px', height: '36px', borderRadius: '50%' }}
        />
      </div>
    </div>
  );
};

export default Navbar;
