import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../../assets/assets';
import './AdminLogin.css';

const AdminLogin = ({ url }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await axios.post(`${url}/api/auth/login`, {
        email: email.trim(),
        password
      });

      if (res.data.success) {
        const user = res.data.user;
        // Verify server-side role is strictly admin
        if (user.role !== 'admin') {
          setErrorMsg('Access denied: Administrator credentials required.');
          return;
        }

        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        toast.success(`Welcome, Admin ${user.name}!`);
        navigate('/dashboard');
      } else {
        setErrorMsg(res.data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@restaurant.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <img src={assets.logo} alt="Tomato Logo" className="admin-login-logo" />
          <span className="admin-portal-badge">ADMINISTRATION WORKSPACE</span>
          <h2>Restaurant Admin Sign In</h2>
          <p>Secure login for menu control, sales analytics, and order oversight</p>
        </div>

        {errorMsg && <div className="admin-login-error">{errorMsg}</div>}

        <form onSubmit={handleAdminLogin}>
          <div className="admin-form-group">
            <label>Admin Email</label>
            <input
              type="email"
              required
              placeholder="admin@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label>Admin Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="admin-login-submit" disabled={loading}>
            {loading ? 'Verifying Admin Privileges...' : 'Sign In as Administrator'}
          </button>
        </form>

        <div className="admin-demo-box">
          <p>Demo Admin Account:</p>
          <button type="button" onClick={fillDemoAdmin} className="admin-fill-demo-btn">
            Quick Fill: admin@restaurant.com / admin123
          </button>
        </div>

        <div className="admin-login-footer">
          <a href="/">← Customer Store</a>
          <a href="/staff/login">Staff POS Portal ➔</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
