import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Orders.css';

const Orders = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshTimerRef = useRef(null);

  // Selected Order for Receipt Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState(null);

  // Record Payment Modal State
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState('Cash');

  // Order workflow states
  const workflowStates = ['Pending', 'Preparing', 'Ready', 'Completed'];

  // Normalization helper for statuses
  const normalizeStatus = (status) => {
    if (!status) return 'Pending';
    if (status === 'Food Processing') return 'Preparing';
    if (status === 'Out for delivery') return 'Ready';
    if (status === 'Delivered') return 'Completed';
    return status;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('staff_token') || localStorage.getItem('admin_token') || localStorage.getItem('token');
    return token ? { headers: { token } } : {};
  };

  const fetchAllOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(`${url}/api/orders`, getAuthHeaders());
      if (res.data.success) {
        setOrders(res.data.data);
      } else {
        if (!silent) toast.error('Error fetching orders');
      }
    } catch (err) {
      console.error(err);
      if (!silent) toast.error('Failed to load orders from server');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // Handle auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchAllOrders(true);
      }, 15000); // 15 seconds
    } else {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    }
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh]);

  // Update order status (Pending, Preparing, Ready, Completed, Cancelled)
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );

      const res = await axios.patch(`${url}/api/orders/${orderId}/status`, {
        status: newStatus
      }, getAuthHeaders());

      if (res.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update status');
        fetchAllOrders(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating order status');
      fetchAllOrders(true);
    }
  };

  // Next status in workflow
  const getNextStatus = (currentStatus) => {
    const norm = normalizeStatus(currentStatus);
    switch (norm) {
      case 'Pending':
        return 'Preparing';
      case 'Preparing':
        return 'Ready';
      case 'Ready':
        return 'Completed';
      default:
        return null;
    }
  };

  // Status badge config (icons and classes)
  const getStatusBadgeInfo = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'Pending':
        return { label: 'Pending', icon: '⏳', className: 'status-badge-pending' };
      case 'Preparing':
        return { label: 'Preparing', icon: '👨‍🍳', className: 'status-badge-preparing' };
      case 'Ready':
        return { label: 'Ready', icon: '🔔', className: 'status-badge-ready' };
      case 'Completed':
        return { label: 'Completed', icon: '✅', className: 'status-badge-completed' };
      case 'Cancelled':
        return { label: 'Cancelled', icon: '❌', className: 'status-badge-cancelled' };
      default:
        return { label: norm, icon: '📋', className: 'status-badge-pending' };
    }
  };

  // Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentOrder) return;
    try {
      const res = await axios.post(`${url}/api/orders/${paymentOrder._id}/payment`, {
        paymentMethod: paymentMethodChoice
      }, getAuthHeaders());
      if (res.data.success) {
        toast.success(`Payment recorded via ${paymentMethodChoice}`);
        setPaymentOrder(null);
        fetchAllOrders(true);
      } else {
        toast.error('Failed to record payment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error recording payment');
    }
  };

  // Compute status counts for filter tabs
  const statusCounts = orders.reduce(
    (acc, o) => {
      acc.All += 1;
      const st = normalizeStatus(o.status);
      if (acc[st] !== undefined) {
        acc[st] += 1;
      }
      return acc;
    },
    { All: 0, Pending: 0, Preparing: 0, Ready: 0, Completed: 0 }
  );

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const norm = normalizeStatus(o.status);
    const matchesStatus =
      selectedStatus === 'All' || norm.toLowerCase() === selectedStatus.toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o._id && o._id.toLowerCase().includes(q)) ||
      norm.toLowerCase().includes(q) ||
      (o.status && o.status.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="order add">
      <div className="orders-page-header">
        <div>
          <h2>Staff Order Management & Kitchen Display</h2>
          <p style={{ margin: '2px 0', fontSize: '13px', color: '#64748b' }}>
            Update order states: <b>Pending</b> ➔ <b>Preparing</b> ➔ <b>Ready</b> ➔ <b>Completed</b>
          </p>
        </div>

        <div className="header-action-controls">
          <button
            type="button"
            className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-refresh order list every 15 seconds"
          >
            <span>{autoRefresh ? '🟢' : '⚪'}</span>
            Auto-refresh (15s)
          </button>

          <button
            type="button"
            className="refresh-orders-btn"
            onClick={() => fetchAllOrders(false)}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs with Counts & Search */}
      <div className="orders-filters-bar">
        <div className="order-status-tabs">
          {['All', ...workflowStates].map((st) => (
            <button
              key={st}
              type="button"
              className={`order-tab-btn ${selectedStatus === st ? 'active' : ''}`}
              onClick={() => setSelectedStatus(st)}
            >
              <span>
                {st === 'Pending' ? '⏳' : st === 'Preparing' ? '👨‍🍳' : st === 'Ready' ? '🔔' : st === 'Completed' ? '✅' : '📋'}
              </span>
              <span>{st}</span>
              <span className="order-tab-count">{statusCounts[st] || 0}</span>
            </button>
          ))}
        </div>

        {/* Dedicated Search Bar for Unique Order ID or Current Status */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none', fontSize: '13px' }}>
            🔍
          </span>
          <input
            type="text"
            className="order-search-input"
            style={{ paddingLeft: '34px', paddingRight: '32px', width: '310px' }}
            placeholder="Search by Order ID or Status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px'
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Feedback Line */}
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
        Showing <b>{filteredOrders.length}</b> of <b>{orders.length}</b> orders
        {(searchQuery || selectedStatus !== 'All') && (
          <span>
            {searchQuery ? ` matching "${searchQuery}"` : ''}
            {selectedStatus !== 'All' ? ` in ${selectedStatus}` : ''}
            {' — '}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('All');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6347',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0
              }}
            >
              Reset filters
            </button>
          </span>
        )}
      </div>

      {/* Orders List */}
      <div className="order-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
            <p>Loading order data...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <span style={{ fontSize: '32px' }}>🍽️</span>
            <p style={{ margin: '8px 0 0 0', fontWeight: 600 }}>No orders found matching "{selectedStatus}" status.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Create an order from the POS Counter or Customer Store.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const currentNormStatus = normalizeStatus(ord.status);
            const badgeInfo = getStatusBadgeInfo(currentNormStatus);
            const nextStatus = getNextStatus(currentNormStatus);
            const isPaid = ord.paymentStatus === 'Paid' || ord.payment;

            return (
              <div key={ord._id} className="order-card">
                {/* Header: Order Number, Prominent Current Status, Type & Time */}
                <div className="order-card-top">
                  <div className="order-title-wrap">
                    <span className="order-number">
                      {ord.orderNumber || ord._id.slice(-6).toUpperCase()}
                    </span>

                    {/* PROMINENT CURRENT STATUS DISPLAY FOR ADMIN VIEW */}
                    <div className={`current-status-badge ${badgeInfo.className}`}>
                      <span>{badgeInfo.icon}</span>
                      <span>{badgeInfo.label}</span>
                    </div>

                    <span
                      className={`order-type-badge ${
                        (ord.orderType || '').toLowerCase().includes('dine')
                          ? 'dine-in'
                          : 'takeaway'
                      }`}
                    >
                      {ord.orderType === 'Dine-in'
                        ? `🍽️ Table ${ord.tableNumber || 'Dine-in'}`
                        : ord.orderType === 'Takeaway'
                        ? '🥡 Takeaway'
                        : '🛵 Online Delivery'}
                    </span>
                  </div>

                  <span className="order-time">
                    {ord.date
                      ? new Date(ord.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      : ''}
                  </span>
                </div>

                {/* Visual Workflow Stepper: Pending ➔ Preparing ➔ Ready ➔ Completed */}
                <div className="workflow-stepper">
                  <span
                    className={`step-node ${
                      currentNormStatus === 'Pending'
                        ? 'active'
                        : ['Preparing', 'Ready', 'Completed'].includes(currentNormStatus)
                        ? 'completed'
                        : ''
                    }`}
                  >
                    1. ⏳ Pending
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>➔</span>
                  <span
                    className={`step-node ${
                      currentNormStatus === 'Preparing'
                        ? 'active'
                        : ['Ready', 'Completed'].includes(currentNormStatus)
                        ? 'completed'
                        : ''
                    }`}
                  >
                    2. 👨‍🍳 Preparing
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>➔</span>
                  <span
                    className={`step-node ${
                      currentNormStatus === 'Ready'
                        ? 'active'
                        : currentNormStatus === 'Completed'
                        ? 'completed'
                        : ''
                    }`}
                  >
                    3. 🔔 Ready
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>➔</span>
                  <span
                    className={`step-node ${
                      currentNormStatus === 'Completed' ? 'completed' : ''
                    }`}
                  >
                    4. ✅ Completed
                  </span>
                </div>

                {/* Order Details Body */}
                <div className="order-card-body">
                  <div className="order-items-list">
                    <b>Dishes ({ord.items?.length || 0}):</b>
                    <p style={{ margin: '4px 0 0 0' }}>
                      {ord.items?.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-block',
                            marginRight: '12px',
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '4px'
                          }}
                        >
                          {item.name} <b>x{item.quantity}</b>
                          {item.price ? ` (₹${item.price * item.quantity})` : ''}
                        </span>
                      ))}
                    </p>
                  </div>

                  <div className="order-customer-info">
                    <b>Customer & Destination:</b>
                    <span>
                      {ord.customerName ||
                        (ord.address?.firstName
                          ? `${ord.address.firstName} ${ord.address.lastName}`
                          : 'Walk-in Customer')}
                    </span>
                    {ord.customerPhone && (
                      <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>
                        📞 {ord.customerPhone}
                      </div>
                    )}
                    {ord.tableNumber && (
                      <div style={{ color: '#2563eb', fontSize: '12px', marginTop: '2px', fontWeight: 600 }}>
                        Table: {ord.tableNumber}
                      </div>
                    )}
                  </div>

                  <div className="order-pricing-info">
                    <span className="order-amount-total">₹{ord.amount}</span>
                    <span className={`order-payment-badge ${isPaid ? 'paid' : 'pending'}`}>
                      {isPaid ? `✓ PAID (${ord.paymentMethod || 'Cash'})` : 'UNPAID / PENDING'}
                    </span>
                  </div>
                </div>

                {/* Bottom Staff Action Controls */}
                <div className="order-card-bottom">
                  {/* FUNCTIONALITY FOR STAFF TO UPDATE ORDER STATES DIRECTLY */}
                  <div className="staff-state-controls">
                    <span className="staff-state-label">Update State:</span>
                    <div className="staff-state-btn-group">
                      {workflowStates.map((state) => {
                        const isActive = currentNormStatus === state;
                        return (
                          <button
                            key={state}
                            type="button"
                            className={`staff-state-btn ${isActive ? `active ${state.toLowerCase()}` : ''}`}
                            onClick={() => handleStatusChange(ord._id, state)}
                            title={`Click to set status to ${state}`}
                          >
                            {state === 'Pending' && '⏳ '}
                            {state === 'Preparing' && '👨‍🍳 '}
                            {state === 'Ready' && '🔔 '}
                            {state === 'Completed' && '✅ '}
                            {state}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="order-action-buttons">
                    {!isPaid && (
                      <button
                        type="button"
                        className="btn-record-payment"
                        onClick={() => setPaymentOrder(ord)}
                      >
                        💳 Record Payment
                      </button>
                    )}

                    {nextStatus && (
                      <button
                        type="button"
                        className="btn-advance-status"
                        onClick={() => handleStatusChange(ord._id, nextStatus)}
                      >
                        Advance to {nextStatus} ➔
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-print-bill"
                      onClick={() => setActiveReceiptOrder(ord)}
                    >
                      🖨️ View / Print Bill
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentOrder && (
        <div className="pos-modal-backdrop" onClick={() => setPaymentOrder(null)}>
          <div className="pos-receipt-modal" onClick={(e) => e.stopPropagation()} style={{ width: '380px' }}>
            <div style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 700 }}>
                Record Payment for {paymentOrder.orderNumber || 'Order'}
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                Bill Amount: <b>₹{paymentOrder.amount}</b>
              </p>

              <form onSubmit={handleRecordPayment}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Select Payment Method:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Cash', 'UPI', 'Card'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethodChoice(m)}
                        style={{
                          flex: 1,
                          padding: '10px 6px',
                          borderRadius: '6px',
                          border: paymentMethodChoice === m ? '2px solid #10b981' : '1px solid #cbd5e1',
                          background: paymentMethodChoice === m ? '#ecfdf5' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {m === 'Cash' ? '💵 Cash' : m === 'UPI' ? '📱 UPI' : '💳 Card'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentOrder(null)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {activeReceiptOrder && (
        <div className="pos-modal-backdrop" onClick={() => setActiveReceiptOrder(null)}>
          <div className="pos-receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-receipt-content" id="order-printable-receipt">
              <div className="receipt-header">
                <h3>FOOD DEL RESTAURANT</h3>
                <p style={{ margin: '2px 0' }}>Bistro & Café POS Terminal</p>
                <p style={{ margin: '2px 0' }}>GSTIN: 27AABCF1234F1Z5</p>
              </div>

              <div className="receipt-meta">
                <div className="receipt-meta-row">
                  <span>Order #:</span>
                  <b>{activeReceiptOrder.orderNumber || activeReceiptOrder._id.slice(-6).toUpperCase()}</b>
                </div>
                <div className="receipt-meta-row">
                  <span>Date:</span>
                  <span>{new Date(activeReceiptOrder.date).toLocaleString()}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Type:</span>
                  <span>
                    {activeReceiptOrder.orderType}{' '}
                    {activeReceiptOrder.tableNumber ? `(${activeReceiptOrder.tableNumber})` : ''}
                  </span>
                </div>
                {activeReceiptOrder.customerName && (
                  <div className="receipt-meta-row">
                    <span>Customer:</span>
                    <span>{activeReceiptOrder.customerName}</span>
                  </div>
                )}
              </div>

              <table className="receipt-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReceiptOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal:</span>
                  <span>₹{activeReceiptOrder.subtotal || activeReceiptOrder.amount}</span>
                </div>
                {activeReceiptOrder.tax > 0 && (
                  <div className="receipt-total-row">
                    <span>Tax (GST):</span>
                    <span>₹{activeReceiptOrder.tax}</span>
                  </div>
                )}
                {activeReceiptOrder.discount > 0 && (
                  <div className="receipt-total-row">
                    <span>Discount:</span>
                    <span>-₹{activeReceiptOrder.discount}</span>
                  </div>
                )}
                <div className="receipt-total-row grand">
                  <span>GRAND TOTAL:</span>
                  <span>₹{activeReceiptOrder.amount}</span>
                </div>
                <div className="receipt-total-row" style={{ marginTop: '4px', fontSize: '11px' }}>
                  <span>Status:</span>
                  <b>{normalizeStatus(activeReceiptOrder.status)?.toUpperCase()}</b>
                </div>
                <div className="receipt-total-row" style={{ fontSize: '11px' }}>
                  <span>Payment:</span>
                  <b>
                    {activeReceiptOrder.paymentStatus === 'Paid' || activeReceiptOrder.payment
                      ? `PAID VIA ${(activeReceiptOrder.paymentMethod || 'Cash').toUpperCase()}`
                      : 'PAYMENT PENDING'}
                  </b>
                </div>
              </div>

              <div className="receipt-footer">
                <p style={{ margin: '4px 0' }}>Thank you for visiting Food Del!</p>
              </div>
            </div>

            <div className="pos-receipt-actions">
              <button
                type="button"
                className="pos-print-btn"
                onClick={() => window.print()}
              >
                🖨️ Print Invoice
              </button>
              <button
                type="button"
                className="pos-close-modal-btn"
                onClick={() => setActiveReceiptOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;