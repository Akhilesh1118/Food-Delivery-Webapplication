import React, { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import { assets } from '../../assets/assets';
import vegetarianDish from '../../assets/food_1.png';
import './EmployeePortalLanding.css';

const EmployeePortalLanding = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') === 'admin' ? 'admin' : 'staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { url } = useContext(StoreContext);
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setSearchParams({ role: nextRole }, { replace: true });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/login';
      const response = await axios.post(`${url}${endpoint}`, { email: email.trim(), password });
      if (!response.data.success || response.data.user?.role !== role) {
        setError(isAdmin ? 'These credentials do not have administrator access.' : 'These credentials do not have staff access.');
        return;
      }

      const { token, user } = response.data;
      if (isAdmin) {
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        window.location.assign('/admin/dashboard');
      } else {
        localStorage.setItem('staff_token', token);
        localStorage.setItem('staff_user', JSON.stringify(user));
        navigate('/staff/dashboard');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Sign in failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell" aria-label="Tomato team sign in">
        <aside className="employee-portal-brand-panel">
          <a className="employee-portal-brand-top" href="/" aria-label="Tomato customer website"><span className="employee-portal-brand-mark">T</span><strong>Tomato.</strong></a>
          <div className="employee-portal-brand-copy">
            <span className="employee-portal-eyebrow">YOUR RESTAURANT, IN SYNC</span>
            <h1>Good food.<br />Smooth service.</h1>
            <p>One clear place for your team to serve guests and keep the day moving.</p>
          </div>
          <div className="employee-portal-photo-wrap"><img className="employee-portal-photo" src={vegetarianDish} alt="Fresh vegetarian salad from the Tomato menu" /></div>
          <div className="employee-portal-brand-foot"><span /> Good food. Great people. Every day.</div>
        </aside>

        <section className="employee-portal-form-panel" aria-labelledby="employee-portal-title">
          <header className="employee-portal-form-header">
            <img src={assets.logo} alt="Tomato" className="employee-portal-logo" />
            <p className="employee-portal-tagline">TEAM WORKSPACE</p>
            <h2 id="employee-portal-title">{isAdmin ? 'Admin sign in' : 'Staff sign in'}</h2>
            <p>{isAdmin ? 'Manage your restaurant workspace.' : 'Sign in to access orders and restaurant service.'}</p>
          </header>

          <div className="employee-role-switch" role="group" aria-label="Choose sign-in role">
            <button type="button" className={role === 'staff' ? 'active' : ''} onClick={() => selectRole('staff')} aria-pressed={role === 'staff'}>
              <span className="employee-role-icon staff" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1.5a7 7 0 0 1 14 0V20"/></svg></span>
              <span><strong>Staff</strong><small>Store operations</small></span>
            </button>
            <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => selectRole('admin')} aria-pressed={role === 'admin'}>
              <span className="employee-role-icon admin" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="15" cy="9" r="5"/><path d="m11.5 12.5-7 7V22h3v-3h3v-3h2"/></svg></span>
              <span><strong>Admin</strong><small>Management access</small></span>
            </button>
          </div>

          {error && <div className="employee-portal-error" role="alert">{error}</div>}

          <form className="employee-portal-form" onSubmit={handleSubmit}>
            <label htmlFor="employee-email">Email address</label>
            <input id="employee-email" type="email" autoComplete="username" required placeholder="you@restaurant.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="employee-password">Password</label>
            <input id="employee-password" type="password" autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" className="employee-portal-submit" disabled={loading}>{loading ? 'Verifying access…' : isAdmin ? 'Sign in to Admin' : 'Sign in to Staff POS'}<span aria-hidden="true">→</span></button>
          </form>

          <footer className="employee-portal-footer"><a href="/">← Back to Tomato</a><span>Secure {isAdmin ? 'administrator' : 'team'} access</span></footer>
        </section>
      </section>
    </main>
  );
};

export default EmployeePortalLanding;
