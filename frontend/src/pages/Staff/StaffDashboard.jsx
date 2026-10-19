import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets } from '../../assets/assets';
import POS from '../POS/POS';
import Orders from '../Orders/Orders';
import './StaffDashboard.css';

const StaffDashboard = ({ url }) => {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'orders'
  const [staffUser, setStaffUser] = useState(null);
  const navigate = useNavigate();
  const apiUrl = url || import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const token = localStorage.getItem('staff_token');
    const userStr = localStorage.getItem('staff_user');

    if (!token) {
      navigate('/staff/login');
      return;
    }

    if (userStr) {
      try {
        setStaffUser(JSON.parse(userStr));
      } catch {
        // fallback
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    navigate('/staff/login');
  };

  return (
    <div className="staff-dashboard-wrapper">
      {/* Staff Top Navigation Bar */}
      <header className="staff-top-nav">
        <div className="staff-nav-brand">
          <img src={assets.logo} alt="Tomato Logo" className="staff-nav-logo" />
          <span className="staff-nav-badge">STAFF POS TERMINAL</span>
        </div>

        <div className="staff-nav-tabs">
          <button
            type="button"
            className={`staff-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            🛒 POS Order Counter
          </button>
          <button
            type="button"
            className={`staff-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Live Orders & Kitchen Display
          </button>
        </div>

        <div className="staff-nav-user-area">
          <div className="staff-user-chip">
            <span style={{ fontSize: '14px' }}>👨‍🍳</span>
            <span>{staffUser?.name || 'Staff Member'}{staffUser?.staffId && <small className="staff-user-id">{staffUser.staffId}</small>}</span>
          </div>

          <a href="/" className="staff-view-store-link" title="Visit customer website">
            🌐 Customer View
          </a>

          <button type="button" onClick={handleLogout} className="staff-logout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {/* Staff Content Body */}
      <main className="staff-main-content">
        {activeTab === 'pos' ? (
          <POS url={apiUrl} isStaffView={true} />
        ) : (
          <Orders url={apiUrl} isStaffView={true} />
        )}
      </main>
    </div>
  );
};

export default StaffDashboard;
