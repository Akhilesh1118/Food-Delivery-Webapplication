import React from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Add from './pages/Add/Add';
import List from './pages/List/List';
import Orders from './pages/Orders/Orders';
import Reports from './pages/Reports/Reports';
import AdminLogin from './pages/Admin/AdminLogin';
import TeamAccess from './pages/TeamAccess/TeamAccess';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Protected Route Guard for Admin Workspace
const ProtectedAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('admin_token');
  const adminUserStr = localStorage.getItem('admin_user');
  let isAdmin = false;

  if (adminToken && adminUserStr) {
    try {
      const user = JSON.parse(adminUserStr);
      isAdmin = user.role === 'admin';
    } catch {
      isAdmin = false;
    }
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const url = import.meta.env.VITE_API_URL || '';
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<AdminLogin url={url} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <ProtectedAdminRoute>
          <Navbar />
          <hr />
          <div className="app-content">
            <Sidebar />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Reports url={url} />} />
              <Route path="/reports" element={<Reports url={url} />} />
              <Route path="/list" element={<List url={url} />} />
              <Route path="/menu" element={<List url={url} />} />
              <Route path="/add" element={<Add url={url} />} />
              <Route path="/orders" element={<Orders url={url} />} />
              <Route path="/team" element={<TeamAccess url={url} />} />
              <Route path="/pos" element={<Navigate to="/orders" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </ProtectedAdminRoute>
      )}
    </div>
  );
};

export default App;
