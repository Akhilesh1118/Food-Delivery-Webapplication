import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Reports.css';

const Reports = ({ url }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Recent Orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const statusOptions = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];

  const normalizeStatus = (status) => {
    if (!status) return 'Pending';
    if (status === 'Food Processing') return 'Preparing';
    if (status === 'Out for delivery') return 'Ready';
    if (status === 'Delivered') return 'Completed';
    return status;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('staff_token') || localStorage.getItem('token');
    return token ? { headers: { token } } : {};
  };

  const fetchDailyReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/api/reports/daily-sales`, getAuthHeaders());
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      toast.error('Failed to load daily sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReports();
  }, []);

  if (loading) {
    return (
      <div className="reports-container" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#64748b' }}>Loading daily sales summary...</p>
      </div>
    );
  }

  const {
    dailySales = 0,
    totalOrders = 0,
    completedOrders = 0,
    activeOrders = 0,
    pendingOrders = 0,
    preparingOrders = 0,
    readyOrders = 0,
    paymentBreakdown = {},
    recentOrders = []
  } = reportData || {};

  // Filter recent orders by Unique Order ID OR Current Status
  const filteredRecentOrders = recentOrders.filter((ord) => {
    const normStatus = normalizeStatus(ord.status);
    const orderId = (ord.orderNumber || ord._id || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    // 1. Status Filter Pill check
    const matchesStatusPill =
      statusFilter === 'All' || normStatus.toLowerCase() === statusFilter.toLowerCase();

    if (!matchesStatusPill) return false;

    // 2. Search query check (filters by Unique Order ID OR Current Status OR Customer/Table)
    if (!query) return true;

    const matchesOrderId = orderId.includes(query) || (ord._id && ord._id.toLowerCase().includes(query));
    const matchesStatus = normStatus.toLowerCase().includes(query) || (ord.status && ord.status.toLowerCase().includes(query));
    const matchesCustomer = ord.customerName && ord.customerName.toLowerCase().includes(query);
    const matchesTable = ord.tableNumber && ord.tableNumber.toLowerCase().includes(query);

    return matchesOrderId || matchesStatus || matchesCustomer || matchesTable;
  });

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div>
          <h2>Daily Sales Summary & Reports</h2>
          <p>Real-time analytics for orders, revenue, and payment collections</p>
        </div>
        <button className="reports-refresh-btn" onClick={fetchDailyReports}>
          🔄 Refresh
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card sales">
          <div className="kpi-icon-wrap">💰</div>
          <div className="kpi-info">
            <span className="kpi-title">Daily Sales</span>
            <span className="kpi-value">₹{dailySales}</span>
          </div>
        </div>

        <div className="kpi-card orders">
          <div className="kpi-icon-wrap">📋</div>
          <div className="kpi-info">
            <span className="kpi-title">Total Orders</span>
            <span className="kpi-value">{totalOrders}</span>
          </div>
        </div>

        <div className="kpi-card completed">
          <div className="kpi-icon-wrap">✅</div>
          <div className="kpi-info">
            <span className="kpi-title">Completed Orders</span>
            <span className="kpi-value">{completedOrders}</span>
          </div>
        </div>

        <div className="kpi-card active">
          <div className="kpi-icon-wrap">🍳</div>
          <div className="kpi-info">
            <span className="kpi-title">Active Orders</span>
            <span className="kpi-value">{activeOrders}</span>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {pendingOrders} Pending • {preparingOrders} Prep • {readyOrders} Ready
            </span>
          </div>
        </div>
      </div>

      {/* Payment Collections Breakdown */}
      <div className="payment-section">
        <h3>Collections by Payment Method</h3>
        <div className="payment-cards">
          <div className="payment-card">
            <div className="payment-card-header">
              <span className="payment-method-name">💵 Cash</span>
              <span className="payment-count-badge">
                {paymentBreakdown.Cash?.count || 0} orders
              </span>
            </div>
            <div className="payment-amount">
              ₹{paymentBreakdown.Cash?.amount || 0}
            </div>
          </div>

          <div className="payment-card">
            <div className="payment-card-header">
              <span className="payment-method-name">📱 UPI / QR</span>
              <span className="payment-count-badge">
                {paymentBreakdown.UPI?.count || 0} orders
              </span>
            </div>
            <div className="payment-amount">
              ₹{paymentBreakdown.UPI?.amount || 0}
            </div>
          </div>

          <div className="payment-card">
            <div className="payment-card-header">
              <span className="payment-method-name">💳 Card</span>
              <span className="payment-count-badge">
                {paymentBreakdown.Card?.count || 0} orders
              </span>
            </div>
            <div className="payment-amount">
              ₹{paymentBreakdown.Card?.amount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS OVERVIEW WITH DEDICATED SEARCH BAR */}
      <div className="recent-orders-section">
        <div className="recent-orders-top-bar">
          <div>
            <h3>Recent Orders List</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Filter by Unique Order ID (e.g. POS-1001) or Current Status
            </span>
          </div>

          {/* Search Controls */}
          <div className="recent-search-controls">
            {/* Search Input Bar */}
            <div className="recent-search-box">
              <span className="recent-search-icon">🔍</span>
              <input
                type="text"
                className="recent-search-input"
                placeholder="Search by Order ID or Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="recent-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Filter Pills */}
            <div className="recent-status-filter-pills">
              {statusOptions.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`recent-filter-pill ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'Pending' && '⏳ '}
                  {st === 'Preparing' && '👨‍🍳 '}
                  {st === 'Ready' && '🔔 '}
                  {st === 'Completed' && '✅ '}
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Counter / Filter Feedback */}
        <div className="recent-results-counter">
          Showing <b>{filteredRecentOrders.length}</b> of <b>{recentOrders.length}</b> recent orders
          {(searchQuery || statusFilter !== 'All') && (
            <span>
              {' '}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
              {statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}
              {' — '}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
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

        {/* Recent Orders Table */}
        {recentOrders.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>
            No orders recorded yet.
          </p>
        ) : filteredRecentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>
              No recent orders match your search for "{searchQuery || statusFilter}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
              style={{
                background: '#ff6347',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Search & Show All
            </button>
          </div>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Type</th>
                <th>Customer / Table</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentOrders.map((ord) => {
                const normStatus = normalizeStatus(ord.status);
                const statusClass = normStatus.toLowerCase();
                const displayId = ord.orderNumber || ord._id.slice(-6).toUpperCase();

                return (
                  <tr key={ord._id}>
                    <td>
                      <b style={{ color: '#0f172a', letterSpacing: '0.5px' }}>{displayId}</b>
                    </td>
                    <td>{ord.orderType || 'Dine-in'}</td>
                    <td>
                      {ord.orderType === 'Dine-in'
                        ? (ord.tableNumber || 'Table')
                        : (ord.customerName || 'Takeaway')}
                    </td>
                    <td><b>₹{ord.amount}</b></td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {ord.paymentMethod || 'Cash'}
                      </span>{' '}
                      <span style={{ fontSize: '11px', color: ord.paymentStatus === 'Paid' ? '#16a34a' : '#d97706' }}>
                        ({ord.paymentStatus || (ord.payment ? 'Paid' : 'Pending')})
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${statusClass}`}>
                        {normStatus === 'Pending' && '⏳ '}
                        {normStatus === 'Preparing' && '👨‍🍳 '}
                        {normStatus === 'Ready' && '🔔 '}
                        {normStatus === 'Completed' && '✅ '}
                        {normStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
