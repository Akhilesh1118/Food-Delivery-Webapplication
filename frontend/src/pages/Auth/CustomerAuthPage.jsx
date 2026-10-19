import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import { assets } from '../../assets/assets';
import vegetarianDish from '../../assets/food_1.png';
import './CustomerAuthPage.css';

const CustomerAuthPage = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [data, setData] = useState({ name: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { url, setToken } = useContext(StoreContext);
  const navigate = useNavigate();
  const isSignup = mode === 'signup';

  const onChangeHandler = (event) => {
    setData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setErrorMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await axios.post(`${url}${endpoint}`, data);
      if (!response.data.success) {
        setErrorMsg(response.data.message || 'Authentication failed');
        return;
      }

      const user = response.data.user;
      const role = user?.role || 'customer';
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);

      if (role === 'admin') {
        localStorage.setItem('admin_token', response.data.token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        window.location.href = '/admin/dashboard';
      } else if (role === 'staff') {
        localStorage.setItem('staff_token', response.data.token);
        localStorage.setItem('staff_user', JSON.stringify(user));
        navigate('/staff/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-auth-page">
      <section className="customer-auth-shell" aria-label="Tomato account sign in">
        <aside className="customer-auth-brand-panel">
          <div className="customer-auth-brand-top">
            <span className="customer-auth-status-dot" /> YOUR EVERYDAY TABLE
          </div>
          <div className="customer-auth-brand-copy">
            <h1>A better way to eat<br />for <span>everyday.</span></h1>
            <p>Sign in to pick up where you left off and keep your orders close at hand.</p>
          </div>
          <div className="customer-auth-photo-wrap">
            <img src={vegetarianDish} alt="Fresh vegetarian salad with fresh vegetables" className="customer-auth-photo" />
            <div className="customer-auth-photo-label"><span>✦</span> Fresh from our kitchen</div>
            <span className="customer-auth-floating-dot customer-auth-floating-dot-one" />
            <span className="customer-auth-floating-dot customer-auth-floating-dot-two" />
          </div>
          <div className="customer-auth-brand-foot">
            <span />
            <p>A simple, delicious experience starts here.</p>
          </div>
        </aside>

        <section className="customer-auth-form-panel">
          <header className="customer-auth-form-header">
            <img src={assets.logo} alt="Tomato" className="customer-auth-logo" />
            <p className="customer-auth-tagline">Good food, made simple.</p>
            <h2>{isSignup ? 'Create your account' : 'Welcome Back!'}</h2>
            <p className="customer-auth-intro">
              {isSignup
                ? 'Join Tomato to track orders and find your new favorites.'
                : 'Sign in to continue shopping, manage your orders, and enjoy a seamless checkout experience.'}
            </p>
          </header>

          {errorMsg && <div className="customer-auth-error" role="alert">{errorMsg}</div>}

          <form className="customer-auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="customer-auth-group">
                <label htmlFor="customer-name">Full name</label>
                <div className="customer-auth-input-wrap">
                  <input id="customer-name" type="text" name="name" autoComplete="name" required placeholder="Your name" value={data.name} onChange={onChangeHandler} />
                </div>
              </div>
            )}

            <div className="customer-auth-group">
              <label htmlFor="customer-email">Email address</label>
              <div className="customer-auth-input-wrap">
                <svg className="customer-auth-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>
                <input id="customer-email" type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={data.email} onChange={onChangeHandler} />
              </div>
            </div>

            <div className="customer-auth-group">
              <label htmlFor="customer-password">Password</label>
              <div className="customer-auth-input-wrap">
                <svg className="customer-auth-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                <input id="customer-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={isSignup ? 6 : undefined} placeholder="Enter your password" value={data.password} onChange={onChangeHandler} />
                <button className="customer-auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.4 9.5 7-.4 1-1.2 2.1-2.3 3.1M6.2 6.2C4.2 7.5 2.9 9.5 2.5 12c.9 2.5 4.4 7 9.5 7 1.1 0 2.1-.2 3-.6" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="customer-auth-submit" disabled={loading}>
              {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In & Continue'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="customer-auth-divider"><span /> OR <span /></div>
          <button type="button" className="customer-auth-employee" onClick={() => navigate('/employee-portal')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            Employee Portal
          </button>

          <p className="customer-auth-toggle">
            {isSignup ? 'Already have an account?' : 'New to Tomato?'}{' '}
            <button type="button" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setErrorMsg(''); setShowPassword(false); }}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </section>
      </section>
    </main>
  );
};

export default CustomerAuthPage;
