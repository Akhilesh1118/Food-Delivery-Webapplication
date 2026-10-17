import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../../assets/assets';
import './StaffLogin.css';

const StaffLogin = ({ url }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
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
        // Verify server-side role
        if (user.role !== 'staff' && user.role !== 'admin') {
          setErrorMsg('Access denied: Staff or Manager credentials required.');
          return;
        }

        localStorage.setItem('staff_token', res.data.token);
        localStorage.setItem('staff_user', JSON.stringify(user));
        toast.success(`Welcome, ${user.name}!`);
        navigate('/staff/dashboard');
      } else {
        setErrorMsg(res.data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoStaff = () => {
    setEmail('staff@restaurant.com');
    setPassword('staff123');
    setErrorMsg('');
  };

  return (
    <div className="staff-login-page">
      <div className="staff-login-card">
        <div className="staff-login-header">
          <img src={assets.logo} alt="Tomato Logo" className="staff-login-logo" />
          <span className="staff-portal-badge">STAFF POS TERMINAL</span>
          <h2>Staff Portal Sign In</h2>
          <p>Sign in to access restaurant order counter and kitchen workflow</p>
        </div>

        {errorMsg && <div className="staff-login-error">{errorMsg}</div>}

        <form onSubmit={handleStaffLogin}>
          <div className="staff-form-group">
            <label>Staff Email</label>
            <input
              type="email"
              required
              placeholder="staff@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="staff-form-group">
            <label>Staff Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="staff-login-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to POS Counter'}
          </button>
        </form>

        <div className="staff-demo-box">
          <p>Demo Staff Account:</p>
          <button type="button" onClick={fillDemoStaff} className="staff-fill-demo-btn">
            Quick Fill: staff@restaurant.com / staff123
          </button>
        </div>

        <div className="staff-login-footer">
          <a href="/">← Back to Customer Website</a>
          <a href="/admin/login">Admin Portal ➔</a>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
