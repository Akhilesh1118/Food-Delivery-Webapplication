import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import './CustomerAuthPage.css';

const CustomerAuthPage = ({ initialMode = "login" }) => {
  const [mode, setMode] = useState(initialMode);
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { url, setToken } = useContext(StoreContext);
  const navigate = useNavigate();

  const onChangeHandler = (e) => {
    setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await axios.post(`${url}${endpoint}`, data);
      if (response.data.success) {
        const user = response.data.user;
        const role = user?.role || "customer";
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);

        if (role === "admin") {
          localStorage.setItem("admin_token", response.data.token);
          localStorage.setItem("admin_user", JSON.stringify(user));
          window.location.href = "/admin/dashboard";
          return;
        } else if (role === "staff") {
          localStorage.setItem("staff_token", response.data.token);
          localStorage.setItem("staff_user", JSON.stringify(user));
          navigate("/staff/dashboard");
          return;
        }
        navigate("/");
      } else {
        setErrorMsg(response.data.message || "Authentication failed");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-container">
      <div className="customer-auth-card">
        <h2>{mode === "login" ? "Customer Sign In" : "Create Customer Account"}</h2>
        <p className="customer-auth-subtitle">
          {mode === "login"
            ? "Welcome back to Tomato! Please enter your details."
            : "Sign up to track orders, save favorites, and enjoy fresh dishes."}
        </p>

        {errorMsg && <div className="customer-auth-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="customer-auth-group">
              <label>Your Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Full name"
                value={data.name}
                onChange={onChangeHandler}
              />
            </div>
          )}

          <div className="customer-auth-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              required
              placeholder="name@example.com"
              value={data.email}
              onChange={onChangeHandler}
            />
          </div>

          <div className="customer-auth-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              value={data.password}
              onChange={onChangeHandler}
            />
          </div>

          <button type="submit" className="customer-auth-submit" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="customer-auth-toggle">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <span onClick={() => { setMode("signup"); setErrorMsg(""); }}>
                Sign Up here
              </span>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <span onClick={() => { setMode("login"); setErrorMsg(""); }}>
                Sign In here
              </span>
            </p>
          )}
        </div>

        <div className="customer-portal-links">
          <span>Staff & Admin Portals:</span>
          <div style={{ display: 'flex', gap: '14px' }}>
            <a href="/staff/login">Staff POS ➔</a>
            <a href="/admin/login">Admin Portal ➔</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuthPage;
