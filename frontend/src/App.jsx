import React, { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import Cart from './pages/Cart/Cart';
import PlaceOrder from './pages/PlaceOrder/PlaceOrder';
import Footer from './components/Footer/Footer';
import LoginPopup from './components/LoginPopup/LoginPopup';
import Verify from './pages/Verify/Verify';
import MyOrders from './pages/MyOrders/MyOrders';
import MenuPage from './pages/MenuPage/MenuPage';
import CustomerAuthPage from './pages/Auth/CustomerAuthPage';
import StaffLogin from './pages/Staff/StaffLogin';
import StaffDashboard from './pages/Staff/StaffDashboard';
import OrderConfirmation from './pages/OrderConfirmation/OrderConfirmation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Protected Route Guard for Staff POS Terminal
const ProtectedStaffRoute = ({ children }) => {
  const staffToken = localStorage.getItem('staff_token');
  const staffUserStr = localStorage.getItem('staff_user');
  let isAuthorized = false;

  if (staffToken && staffUserStr) {
    try {
      const user = JSON.parse(staffUserStr);
      isAuthorized = user.role === 'staff' || user.role === 'admin';
    } catch {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    return <Navigate to="/staff/login" replace />;
  }

  return children;
};

const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  const location = useLocation();
  const url = import.meta.env.VITE_API_URL || '';

  const isStaffRoute = location.pathname.startsWith('/staff');

  return (
    <>
      <ToastContainer position="top-right" autoClose={2500} />
      {showLogin && !isStaffRoute ? <LoginPopup setShowLogin={setShowLogin} /> : null}

      {isStaffRoute ? (
        <div className="staff-app-container">
          <Routes>
            <Route path="/staff/login" element={<StaffLogin url={url} />} />
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedStaffRoute>
                  <StaffDashboard url={url} />
                </ProtectedStaffRoute>
              }
            />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/staff/*" element={<Navigate to="/staff/dashboard" replace />} />
          </Routes>
        </div>
      ) : (
        <>
          <div className="app">
            <Navbar setShowLogin={setShowLogin} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/login" element={<CustomerAuthPage initialMode="login" />} />
              <Route path="/signup" element={<CustomerAuthPage initialMode="signup" />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order" element={<PlaceOrder />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/myorders" element={<MyOrders />} />
            </Routes>
          </div>
          <Footer />
        </>
      )}
    </>
  );
};

export default App;
