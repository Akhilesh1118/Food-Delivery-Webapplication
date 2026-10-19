import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from "react-router-dom"
import axios from 'axios'

// Automatically attach JWT admin or staff token to outgoing API requests
axios.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token');
  const staffToken = localStorage.getItem('staff_token');
  const generalToken = localStorage.getItem('token');
  const token = adminToken || staffToken || generalToken;
  if (token && !config.headers.token && !config.headers.Authorization) {
    config.headers.token = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <BrowserRouter basename="/admin">
    <App />
  </BrowserRouter>
)
