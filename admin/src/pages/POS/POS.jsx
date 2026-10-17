import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './POS.css';

const POS = ({ url }) => {
  const [menuList, setMenuList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Active Order State
  const [orderType, setOrderType] = useState('Dine-in');
  const [tableNumber, setTableNumber] = useState('T-01');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [taxPercent, setTaxPercent] = useState(5);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const categories = [
    'All',
    'Salad',
    'Rolls',
    'Deserts',
    'Sandwich',
    'Cake',
    'Pure Veg',
    'Pasta',
    'Noodles'
  ];

  const quickTables = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'];

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const res = await axios.get(`${url}/api/menu`);
      if (res.data.success) {
        setMenuList(res.data.data);
      }
    } catch (err) {
      console.error('POS fetch menu error:', err);
      toast.error('Failed to load menu items');
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http') || image.startsWith('data:') || image.startsWith('/src/')) {
      return image;
    }
    return `${url}/images/${image}`;
  };

  // Add item to bill
  const handleAddItem = (item) => {
    if (item.isAvailable === false) {
      toast.warn(`"${item.name}" is currently Out of Stock`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleUpdateQty = (itemId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item._id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems((prev) => prev.filter((i) => i._id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const taxAmount = Math.round((subtotal * Number(taxPercent || 0)) / 100);
  const grandTotal = Math.max(0, subtotal + taxAmount - Number(discount || 0));

  // Submit POS Order
  const handleCreateOrder = async (payNow = true) => {
    if (cartItems.length === 0) {
      toast.warn('Please add at least one item to create an order');
      return;
    }

    if (orderType === 'Dine-in' && !tableNumber) {
      toast.warn('Please select or specify a table number');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        orderType,
        tableNumber: orderType === 'Dine-in' ? tableNumber : '',
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items: cartItems.map((item) => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        taxPercent: Number(taxPercent),
        discount: Number(discount || 0),
        paymentMethod: payNow ? paymentMethod : 'Pending',
        paymentStatus: payNow ? 'Paid' : 'Pending'
      };

      const res = await axios.post(`${url}/api/orders`, payload);

      if (res.data.success) {
        toast.success(`Order ${res.data.orderNumber || ''} created!`);
        setCreatedOrder(res.data.data);
        setShowReceipt(true);
        handleClearCart();
      } else {
        toast.error(res.data.message || 'Error creating order');
      }
    } catch (err) {
      console.error('POS order error:', err);
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered menu
  const filteredMenu = menuList.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="pos-container">
      {/* LEFT: Menu Catalog & Categories */}
      <div className="pos-left">
        <div className="pos-header">
          <div>
            <h2>Restaurant POS Counter</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Create instant dine-in & takeaway bills with live calculation
            </p>
          </div>
          <div className="pos-search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="pos-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pos-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {loadingMenu ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Loading menu items...
          </div>
        ) : filteredMenu.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            No matching items found.
          </div>
        ) : (
          <div className="pos-menu-grid">
            {filteredMenu.map((item) => {
              const isAvailable = item.isAvailable !== false;
              return (
                <div
                  key={item._id}
                  className={`pos-item-card ${!isAvailable ? 'out-of-stock' : ''}`}
                  onClick={() => handleAddItem(item)}
                >
                  <div className="pos-item-img-wrap">
                    <img src={getImageUrl(item.image)} alt={item.name} loading="lazy" />
                    {!isAvailable && (
                      <div className="pos-stock-badge">Out of Stock</div>
                    )}
                  </div>
                  <div className="pos-item-info">
                    <span className="pos-item-cat">{item.category}</span>
                    <span className="pos-item-name">{item.name}</span>
                    <div className="pos-item-bottom">
                      <span className="pos-item-price">₹{item.price}</span>
                      <span className="pos-item-add-btn">
                        {isAvailable ? '+' : '✕'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Current Bill Slip & Checkout */}
      <div className="pos-right">
        <div className="pos-bill-header">
          {/* Order Type Selector */}
          <div className="pos-order-type-tabs">
            <button
              type="button"
              className={`pos-order-type-btn ${orderType === 'Dine-in' ? 'active' : ''}`}
              onClick={() => setOrderType('Dine-in')}
            >
              🍽️ Dine-in
            </button>
            <button
              type="button"
              className={`pos-order-type-btn ${orderType === 'Takeaway' ? 'active' : ''}`}
              onClick={() => setOrderType('Takeaway')}
            >
              🥡 Takeaway
            </button>
          </div>

          <div className="pos-order-inputs">
            {orderType === 'Dine-in' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Select Table
                  </span>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    style={{ width: '60px', padding: '1px 4px', fontSize: '11px', textAlign: 'center' }}
                  />
                </div>
                <div className="pos-table-selector">
                  {quickTables.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`pos-table-chip ${tableNumber === t ? 'selected' : ''}`}
                      onClick={() => setTableNumber(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pos-input-row">
                <input
                  type="text"
                  className="pos-input-field"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="text"
                  className="pos-input-field"
                  placeholder="Phone No."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bill Line Items */}
        <div className="pos-bill-items">
          {cartItems.length === 0 ? (
            <div className="pos-empty-cart">
              <span>🧾</span>
              <p style={{ margin: 0, fontSize: '13px' }}>Bill is empty</p>
              <p style={{ margin: 0, fontSize: '11px' }}>Click dishes on the left to add</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item._id} className="pos-bill-item-row">
                <div className="pos-bill-item-info">
                  <div className="pos-bill-item-name">{item.name}</div>
                  <div className="pos-bill-item-rate">₹{item.price} each</div>
                </div>
                <div className="pos-qty-stepper">
                  <button
                    type="button"
                    className="pos-qty-btn"
                    onClick={() => handleUpdateQty(item._id, -1)}
                  >
                    -
                  </button>
                  <span className="pos-qty-val">{item.quantity}</span>
                  <button
                    type="button"
                    className="pos-qty-btn"
                    onClick={() => handleUpdateQty(item._id, 1)}
                  >
                    +
                  </button>
                </div>
                <div className="pos-bill-item-total">
                  ₹{item.price * item.quantity}
                </div>
                <button
                  type="button"
                  className="pos-bill-item-remove"
                  onClick={() => handleRemoveItem(item._id)}
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Payment Recording */}
        <div className="pos-bill-footer">
          <div className="pos-calc-row">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="pos-calc-row">
            <span>Tax (GST %)</span>
            <input
              type="number"
              className="pos-discount-input"
              min="0"
              max="100"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="pos-calc-row">
            <span>Tax Amount</span>
            <span>₹{taxAmount}</span>
          </div>
          <div className="pos-calc-row">
            <span>Discount (₹)</span>
            <input
              type="number"
              className="pos-discount-input"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="pos-calc-row grand-total">
            <span>Total Bill</span>
            <span>₹{grandTotal}</span>
          </div>

          {/* Payment Method Selector */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            Payment Method
          </div>
          <div className="pos-payment-selector">
            {['Cash', 'UPI', 'Card'].map((method) => (
              <button
                key={method}
                type="button"
                className={`pos-payment-btn ${paymentMethod === method ? 'active' : ''}`}
                onClick={() => setPaymentMethod(method)}
              >
                {method === 'Cash' ? '💵 Cash' : method === 'UPI' ? '📱 UPI' : '💳 Card'}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pos-action-btns">
            <button
              type="button"
              className="pos-pending-btn"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={() => handleCreateOrder(false)}
            >
              Save Pending
            </button>
            <button
              type="button"
              className="pos-submit-btn"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={() => handleCreateOrder(true)}
            >
              {isSubmitting ? 'Processing...' : `Pay ₹${grandTotal} & Place`}
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-FRIENDLY BILL / INVOICE MODAL */}
      {showReceipt && createdOrder && (
        <div className="pos-modal-backdrop" onClick={() => setShowReceipt(false)}>
          <div className="pos-receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-receipt-content" id="printable-receipt">
              <div className="receipt-header">
                <h3>FOOD DEL RESTAURANT</h3>
                <p style={{ margin: '2px 0' }}>Bistro & Café POS Terminal</p>
                <p style={{ margin: '2px 0' }}>GSTIN: 27AABCF1234F1Z5</p>
              </div>

              <div className="receipt-meta">
                <div className="receipt-meta-row">
                  <span>Order #:</span>
                  <b>{createdOrder.orderNumber}</b>
                </div>
                <div className="receipt-meta-row">
                  <span>Date:</span>
                  <span>{new Date(createdOrder.date).toLocaleString()}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Type:</span>
                  <span>
                    {createdOrder.orderType}{' '}
                    {createdOrder.tableNumber ? `(${createdOrder.tableNumber})` : ''}
                  </span>
                </div>
                {createdOrder.customerName && (
                  <div className="receipt-meta-row">
                    <span>Customer:</span>
                    <span>{createdOrder.customerName}</span>
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
                  {createdOrder.items?.map((item, idx) => (
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
                  <span>₹{createdOrder.subtotal || subtotal}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Tax (5% GST):</span>
                  <span>₹{createdOrder.tax}</span>
                </div>
                {createdOrder.discount > 0 && (
                  <div className="receipt-total-row">
                    <span>Discount:</span>
                    <span>-₹{createdOrder.discount}</span>
                  </div>
                )}
                <div className="receipt-total-row grand">
                  <span>GRAND TOTAL:</span>
                  <span>₹{createdOrder.amount}</span>
                </div>
                <div className="receipt-total-row" style={{ marginTop: '4px', fontSize: '11px' }}>
                  <span>Payment:</span>
                  <b>
                    {createdOrder.paymentStatus === 'Paid'
                      ? `PAID VIA ${createdOrder.paymentMethod?.toUpperCase()}`
                      : 'PENDING'}
                  </b>
                </div>
              </div>

              <div className="receipt-footer">
                <p style={{ margin: '4px 0' }}>Thank you for dining with us!</p>
                <p style={{ margin: '2px 0' }}>Please visit again.</p>
              </div>
            </div>

            <div className="pos-receipt-actions">
              <button
                type="button"
                className="pos-print-btn"
                onClick={() => window.print()}
              >
                🖨️ Print Bill
              </button>
              <button
                type="button"
                className="pos-close-modal-btn"
                onClick={() => setShowReceipt(false)}
              >
                Done / New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
