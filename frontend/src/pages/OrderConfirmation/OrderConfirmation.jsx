import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  // Parse query params if direct navigation or refresh
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('orderId') || location.state?.orderId;
  const orderNumber = queryParams.get('orderNumber') || location.state?.orderNumber;

  useEffect(() => {
    if (!order && orderId) {
      const fetchOrder = async () => {
        try {
          const res = await axios.get(`/api/orders/${orderId}`);
          if (res.data.success) {
            setOrder(res.data.data);
          }
        } catch (_e) {
          console.warn('Could not fetch order confirmation details:', _e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId, order]);

  if (loading) {
    return (
      <div className="order-confirm-container" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#64748b' }}>Loading order confirmation...</p>
      </div>
    );
  }

  const displayOrder = order || {
    orderNumber: orderNumber || 'TOM-CONFIRMED',
    orderType: location.state?.orderType || 'Dine-in',
    tableNumber: location.state?.tableNumber || '',
    amount: location.state?.amount || 0,
    paymentMethod: location.state?.paymentMethod || 'Cash',
    paymentStatus: 'Pending',
    status: 'Pending',
    items: location.state?.items || []
  };

  return (
    <div className="order-confirm-container">
      <div className="order-confirm-card">
        {/* Success Header */}
        <div className="order-confirm-header">
          <div className="confirm-icon-wrap">🎉</div>
          <h2>Order Placed Successfully!</h2>
          <p className="confirm-subtext">
            Thank you for dining with <strong>Tomato</strong>. Your order is recorded and sent to the kitchen.
          </p>
        </div>

        {/* Order Identifier & Badges */}
        <div className="confirm-meta-banner">
          <div>
            <span className="confirm-meta-label">Unique Order Number</span>
            <div className="confirm-order-num">{displayOrder.orderNumber}</div>
          </div>
          <div className="confirm-status-badges">
            <span className="confirm-badge status-pending">
              ⏳ Status: {displayOrder.status || 'Pending'}
            </span>
            <span className="confirm-badge payment-pending">
              💳 Payment: {displayOrder.paymentStatus || 'Pending'}
            </span>
          </div>
        </div>

        {/* Order Type & Instructions Banner */}
        <div className="confirm-details-box">
          <div className="confirm-detail-row">
            <span>Order Type:</span>
            <strong>{displayOrder.orderType}</strong>
          </div>

          {displayOrder.orderType === 'Dine-in' && displayOrder.tableNumber && (
            <div className="confirm-detail-row" style={{ background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              <span style={{ color: '#047857', fontWeight: 600 }}>Assigned Dining Table:</span>
              <strong style={{ color: '#065f46', fontSize: '16px' }}>🍽️ {displayOrder.tableNumber}</strong>
            </div>
          )}

          {displayOrder.address && displayOrder.address.street && (
            <div className="confirm-detail-row">
              <span>Delivery Address:</span>
              <span>
                {displayOrder.address.street}, {displayOrder.address.city}, {displayOrder.address.zipcode}
              </span>
            </div>
          )}

          <div className="confirm-detail-row">
            <span>Selected Payment Method:</span>
            <strong>{displayOrder.paymentMethod}</strong>
          </div>
        </div>

        {/* Truthful Payment Notice */}
        <div className="confirm-payment-notice">
          <span style={{ fontSize: '18px' }}>ℹ️</span>
          <div>
            <strong>Payment Status Notice:</strong>
            <p>
              Your order has been placed. Payment is marked as <strong>Pending</strong> and will be collected via{' '}
              <strong>{displayOrder.paymentMethod}</strong>{' '}
              {displayOrder.orderType === 'Dine-in'
                ? 'at the restaurant table or counter.'
                : displayOrder.orderType === 'Takeaway'
                ? 'at the pickup counter.'
                : 'upon delivery to your door.'}
            </p>
          </div>
        </div>

        {/* Items Summary if available */}
        {displayOrder.items && displayOrder.items.length > 0 && (
          <div className="confirm-items-summary">
            <h3>Dishes Ordered</h3>
            <ul>
              {displayOrder.items.map((it, idx) => (
                <li key={it._id || idx}>
                  <span>
                    {it.name} <strong style={{ color: '#ff6347' }}>× {it.quantity}</strong>
                  </span>
                  <span>₹{it.price * it.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="confirm-total-row">
              <span>Total Bill</span>
              <span style={{ color: '#ff6347', fontSize: '18px', fontWeight: 700 }}>
                ₹{displayOrder.amount}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="confirm-actions">
          <Link to="/myorders" className="confirm-btn primary">
            📦 Track in My Orders
          </Link>
          <Link to="/menu" className="confirm-btn secondary">
            📖 Browse Menu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
