import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AdminLogin.css';

const AdminLogin = ({ url }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await axios.post(`${url}/api/auth/admin/login`, {
        email: email.trim(),
        password
      });
      const user = res.data.user;
      if (!res.data.success || user?.role !== 'admin') {
        setErrorMsg('Administrator access could not be verified.');
        return;
      }
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      toast.success(`Welcome back, ${user.name}.`);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Sign in failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <aside className="admin-login-story">
        <a className="admin-story-brand" href="/" aria-label="Tomato home">
          <span className="admin-story-mark">T</span><span>tomato<span className="admin-brand-dot">.</span></span>
        </a>
        <div className="admin-story-copy">
          <span className="admin-story-eyebrow">YOUR RESTAURANT, IN SYNC</span>
          <h1>Good food.<br />Smooth service.</h1>
          <p>One clear view of your menu, orders, and daily performance.</p>
          <div className="admin-story-pills"><span>01&nbsp; Menu</span><span>02&nbsp; Orders</span><span>03&nbsp; Insights</span></div>
        </div>
        <div className="admin-story-foot"><span className="admin-live-dot" /> Your workspace is ready</div>
      </aside>

      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <header className="admin-login-header">
          <div className="admin-mobile-brand">tomato<span>.</span></div>
          <span className="admin-portal-badge"><span /> PRIVATE ADMIN ACCESS</span>
          <h2 id="admin-login-title">Welcome back</h2>
          <p>Sign in to manage your restaurant workspace.</p>
        </header>

        {errorMsg && <div className="admin-login-error" role="alert">{errorMsg}</div>}

        <form onSubmit={handleAdminLogin}>
          <div className="admin-form-group">
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" required placeholder="you@restaurant.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button type="submit" className="admin-login-submit" disabled={loading}>
            {loading ? 'Verifying access…' : 'Sign in to workspace'}
          </button>
        </form>

        <div className="admin-login-secure"><span aria-hidden="true">⌑</span> Administrator access is private and protected.</div>
        <footer className="admin-login-footer">
          <a href="/">← Back to Tomato</a>
          <a href="/staff/login">Staff sign in →</a>
        </footer>
      </section>
    </main>
  );
};

export default AdminLogin;
