import React, { useContext, useEffect, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const { getTotalCartAmount, token, food_list, cartItems, url, clearCart } = useContext(StoreContext);
  const navigate = useNavigate();

  // Order Type State: "Dine-in" | "Takeaway" | "Delivery"
  const [orderType, setOrderType] = useState("Dine-in");

  // Dine-in Table State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);

  // Customer Contact State
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: ""
  });

  // Delivery Address State
  const [addressData, setAddressData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "India",
    phone: ""
  });

  // Payment Method State: "Cash" | "UPI"
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch real-time dining tables
  const fetchTables = async () => {
    try {
      setLoadingTables(true);
      const res = await axios.get(`${url}/api/tables`);
      if (res.data.success) {
        setTables(res.data.data);
        // Pre-select first available table if none selected
        const firstAvailable = res.data.data.find((t) => t.isAvailable);
        if (firstAvailable && !selectedTable) {
          setSelectedTable(firstAvailable.tableNumber);
        }
      }
    } catch (err) {
      console.warn("Could not fetch tables:", err.message);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [url]);

  useEffect(() => {
    if (!token) {
      navigate('/cart');
    } else if (getTotalCartAmount() === 0) {
      navigate('/cart');
    }
  }, [token, navigate, getTotalCartAmount]);

  const onCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
    setErrorMsg("");
  };

  const onAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg("");
  };

  // Calculations
  const subtotal = getTotalCartAmount();
  const deliveryFee = orderType === "Delivery" ? 50 : 0;
  const finalTotal = subtotal + deliveryFee;

  // Helper to load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Validation
    if (orderType === "Dine-in") {
      if (!selectedTable) {
        setErrorMsg("Please select an available dining table.");
        return;
      }
      if (!customerInfo.name.trim()) {
        setErrorMsg("Please enter your name for the table reservation.");
        return;
      }
      if (!customerInfo.phone.trim()) {
        setErrorMsg("Please enter your phone number.");
        return;
      }
    } else if (orderType === "Takeaway") {
      if (!customerInfo.name.trim()) {
        setErrorMsg("Please enter your name for counter pickup.");
        return;
      }
      if (!customerInfo.phone.trim()) {
        setErrorMsg("Please enter your contact phone number.");
        return;
      }
    } else if (orderType === "Delivery") {
      if (!addressData.firstName.trim() || !addressData.street.trim() || !addressData.city.trim() || !addressData.zipcode.trim()) {
        setErrorMsg("Please fill in all required delivery address fields.");
        return;
      }
      if (!addressData.phone.trim()) {
        setErrorMsg("Please provide a phone number for the delivery driver.");
        return;
      }
    }

    // Collect order items
    const orderItems = [];
    food_list.forEach((item) => {
      if (cartItems[item._id] > 0) {
        orderItems.push({
          _id: item._id,
          name: item.name,
          price: item.price,
          category: item.category,
          quantity: cartItems[item._id]
        });
      }
    });

    if (orderItems.length === 0) {
      setErrorMsg("Your cart is empty. Please add dishes before placing an order.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        orderType,
        tableNumber: orderType === "Dine-in" ? selectedTable : "",
        customerName: orderType === "Delivery" ? `${addressData.firstName} ${addressData.lastName}`.trim() : customerInfo.name.trim(),
        customerPhone: orderType === "Delivery" ? addressData.phone.trim() : customerInfo.phone.trim(),
        address: orderType === "Delivery" ? addressData : {},
        items: orderItems,
        paymentMethod,
        paymentStatus: "Pending"
      };

      const response = await axios.post(`${url}/api/order/place`, payload, {
        headers: { token }
      });

      if (response.data.success) {
        const resData = response.data;

        // Razorpay Online UPI Checkout Flow
        if (resData.requiresRazorpay) {
          const scriptLoaded = await loadRazorpayScript();
          
          if (!scriptLoaded || !window.Razorpay) {
            setErrorMsg("Failed to load Razorpay SDK. Please check your internet connection.");
            setLoading(false);
            return;
          }

          const options = {
            key: resData.key,
            amount: resData.amount,
            currency: resData.currency || "INR",
            name: "Tomato Restaurant",
            description: `Order #${resData.orderNumber} - ${orderType}`,
            order_id: resData.razorpayOrderId,
            prefill: {
              name: payload.customerName,
              contact: payload.customerPhone,
              email: addressData.email || ""
            },
            theme: {
              color: "#ff6347"
            },
            config: {
              display: {
                blocks: {
                  upi_collect: {
                    name: "UPI ID / VPA (Test with success@razorpay)",
                    instruments: [
                      {
                        method: "upi",
                        flows: ["collect"]
                      }
                    ]
                  },
                  upi_qr: {
                    name: "UPI QR Code",
                    instruments: [
                      {
                        method: "upi",
                        flows: ["qr"]
                      }
                    ]
                  },
                  cards: {
                    name: "Cards, Netbanking & Other Methods",
                    instruments: [
                      { method: "card" },
                      { method: "netbanking" },
                      { method: "wallet" }
                    ]
                  }
                },
                sequence: ["block.upi_collect", "block.upi_qr", "block.cards"]
              }
            },
            handler: async function (razorpayRes) {
              try {
                setLoading(true);
                toast.info("Verifying payment signature with server...");
                const verifyRes = await axios.post(
                  `${url}/api/order/verify-razorpay`,
                  {
                    razorpay_order_id: razorpayRes.razorpay_order_id,
                    razorpay_payment_id: razorpayRes.razorpay_payment_id,
                    razorpay_signature: razorpayRes.razorpay_signature,
                    orderId: resData.orderId
                  },
                  { headers: { token } }
                );

                if (verifyRes.data.success) {
                  if (clearCart) clearCart();
                  toast.success(`Payment verified! Order ${resData.orderNumber} confirmed.`);
                  navigate('/order-confirmation', {
                    state: {
                      order: verifyRes.data.data,
                      orderId: resData.orderId,
                      orderNumber: resData.orderNumber,
                      orderType,
                      tableNumber: selectedTable,
                      amount: finalTotal,
                      paymentMethod: "UPI (Razorpay Verified)",
                      items: orderItems
                    }
                  });
                } else {
                  setErrorMsg(verifyRes.data.message || "Razorpay payment verification failed.");
                  toast.error("Payment signature verification failed.");
                }
              } catch (verifyErr) {
                console.error(verifyErr);
                setErrorMsg(verifyErr.response?.data?.message || "Server error verifying payment.");
                toast.error("Error verifying Razorpay payment.");
              } finally {
                setLoading(false);
              }
            },
            modal: {
              ondismiss: function () {
                setLoading(false);
                setErrorMsg("Payment closed before completion. Order is in 'Payment Pending' state.");
                toast.warn("Razorpay payment cancelled or dismissed.");
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", function (failRes) {
            setLoading(false);
            setErrorMsg(`Payment failed: ${failRes.error?.description || "Transaction declined"}`);
            toast.error("Razorpay payment failed.");
          });
          rzp.open();
          return;
        }

        // Cash Checkout Flow
        const orderData = resData.data;
        if (clearCart) clearCart();
        toast.success(`Order ${orderData.orderNumber} placed successfully!`);
        navigate('/order-confirmation', {
          state: {
            order: orderData,
            orderId: resData.orderId,
            orderNumber: resData.orderNumber,
            orderType,
            tableNumber: selectedTable,
            amount: finalTotal,
            paymentMethod: orderType === "Dine-in" 
              ? (paymentMethod === "Cash" ? "Cash at Restaurant Counter" : "UPI Payment") 
              : orderType === "Takeaway" 
              ? (paymentMethod === "Cash" ? "Cash at Pickup Counter" : "UPI Payment") 
              : (paymentMethod === "Cash" ? "Cash on Delivery (COD)" : "UPI Payment"),
            items: orderItems
          }
        });
      } else {
        setErrorMsg(response.data.message || "Failed to place order.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || "Network error while placing order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="place-order-page">
      <div className="place-order-header">
        <h2>Restaurant Checkout</h2>
        <p>Choose your dining option, review bill details, and place your order</p>
      </div>

      {errorMsg && <div className="checkout-error-banner">{errorMsg}</div>}

      <form onSubmit={handlePlaceOrder} className="place-order-form">
        {/* Left Column: Order Type & Details */}
        <div className="place-order-left">
          {/* 1. Order Type Selection */}
          <div className="checkout-section">
            <h3 className="section-title">1. Select Order Type</h3>
            <div className="order-type-selector">
              <div
                className={`order-type-card ${orderType === "Dine-in" ? "active" : ""}`}
                onClick={() => setOrderType("Dine-in")}
              >
                <div className="type-icon">🍽️</div>
                <div className="type-title">Dine-in</div>
                <div className="type-desc">Reserved Table Service (No delivery fee)</div>
              </div>

              <div
                className={`order-type-card ${orderType === "Takeaway" ? "active" : ""}`}
                onClick={() => setOrderType("Takeaway")}
              >
                <div className="type-icon">🥡</div>
                <div className="type-title">Takeaway</div>
                <div className="type-desc">Self-pickup at Restaurant Counter (No delivery fee)</div>
              </div>

              <div
                className={`order-type-card ${orderType === "Delivery" ? "active" : ""}`}
                onClick={() => setOrderType("Delivery")}
              >
                <div className="type-icon">🛵</div>
                <div className="type-title">Delivery</div>
                <div className="type-desc">Doorstep delivery (₹50 delivery charge)</div>
              </div>
            </div>
          </div>

          {/* 2. Dynamic Details Based on Order Type */}
          {orderType === "Dine-in" && (
            <div className="checkout-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="section-title" style={{ margin: 0 }}>2. Select Dining Table</h3>
                <button type="button" onClick={fetchTables} className="table-refresh-link">
                  🔄 Refresh Tables
                </button>
              </div>

              {loadingTables ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                  Checking table availability...
                </div>
              ) : (
                <div className="tables-grid">
                  {tables.map((t) => {
                    const isSelected = selectedTable === t.tableNumber;
                    return (
                      <div
                        key={t.tableNumber}
                        className={`table-card ${isSelected ? "selected" : ""} ${!t.isAvailable ? "occupied" : ""}`}
                        onClick={() => {
                          if (t.isAvailable) {
                            setSelectedTable(t.tableNumber);
                            setErrorMsg("");
                          }
                        }}
                      >
                        <div className="table-card-top">
                          <span className="table-card-number">{t.tableNumber}</span>
                          <span className={`table-badge ${t.isAvailable ? "available" : "busy"}`}>
                            {t.isAvailable ? "Available" : "Occupied"}
                          </span>
                        </div>
                        <div className="table-card-meta">
                          <span>👥 {t.capacity} Seats</span>
                          <span>📍 {t.section}</span>
                        </div>
                        {!t.isAvailable && t.occupiedBy && (
                          <div className="table-occupied-info">
                            Occupied by {t.occupiedBy.orderNumber}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: "20px" }}>
                <h4 style={{ fontSize: "14px", color: "#334155", marginBottom: "8px" }}>
                  Customer Contact for Table {selectedTable || "..."}
                </h4>
                <div className="multi-fields">
                  <input
                    type="text"
                    required
                    name="name"
                    placeholder="Your Full Name"
                    value={customerInfo.name}
                    onChange={onCustomerInfoChange}
                  />
                  <input
                    type="tel"
                    required
                    name="phone"
                    placeholder="Contact Phone Number"
                    value={customerInfo.phone}
                    onChange={onCustomerInfoChange}
                  />
                </div>
              </div>
            </div>
          )}

          {orderType === "Takeaway" && (
            <div className="checkout-section">
              <h3 className="section-title">2. Takeaway Pickup Contact</h3>
              <p style={{ color: "#64748b", fontSize: "13px", marginTop: "-6px", marginBottom: "14px" }}>
                Enter your details so our staff can call your name and notify you when dishes are packed.
              </p>
              <div className="multi-fields">
                <input
                  type="text"
                  required
                  name="name"
                  placeholder="Your Full Name"
                  value={customerInfo.name}
                  onChange={onCustomerInfoChange}
                />
                <input
                  type="tel"
                  required
                  name="phone"
                  placeholder="Mobile Phone Number"
                  value={customerInfo.phone}
                  onChange={onCustomerInfoChange}
                />
              </div>
              <div className="takeaway-notice-box">
                ℹ️ <strong>Pickup Location:</strong> Tomato Central Kitchen, Counter #1. Estimated preparation time: 15–20 minutes.
              </div>
            </div>
          )}

          {orderType === "Delivery" && (
            <div className="checkout-section">
              <h3 className="section-title">2. Delivery Address</h3>
              <div className="multi-fields">
                <input
                  required
                  name="firstName"
                  onChange={onAddressChange}
                  value={addressData.firstName}
                  type="text"
                  placeholder="First name"
                />
                <input
                  required
                  name="lastName"
                  onChange={onAddressChange}
                  value={addressData.lastName}
                  type="text"
                  placeholder="Last name"
                />
              </div>
              <input
                required
                name="email"
                onChange={onAddressChange}
                value={addressData.email}
                type="email"
                placeholder="Email address"
              />
              <input
                required
                name="street"
                onChange={onAddressChange}
                value={addressData.street}
                type="text"
                placeholder="Street address & flat / building"
              />
              <div className="multi-fields">
                <input
                  required
                  name="city"
                  onChange={onAddressChange}
                  value={addressData.city}
                  type="text"
                  placeholder="City"
                />
                <input
                  required
                  name="state"
                  onChange={onAddressChange}
                  value={addressData.state}
                  type="text"
                  placeholder="State"
                />
              </div>
              <div className="multi-fields">
                <input
                  required
                  name="zipcode"
                  onChange={onAddressChange}
                  value={addressData.zipcode}
                  type="text"
                  placeholder="Zip / Postal Code"
                />
                <input
                  required
                  name="country"
                  onChange={onAddressChange}
                  value={addressData.country}
                  type="text"
                  placeholder="Country"
                />
              </div>
              <input
                required
                name="phone"
                onChange={onAddressChange}
                value={addressData.phone}
                type="tel"
                placeholder="Phone number"
              />
            </div>
          )}

          {/* 3. Payment Method Selection */}
          <div className="checkout-section">
            <h3 className="section-title">3. Payment Method</h3>
            <div className="payment-options-grid">
              <label className={`payment-method-label ${paymentMethod === "Cash" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash"
                  checked={paymentMethod === "Cash"}
                  onChange={() => setPaymentMethod("Cash")}
                />
                <div>
                  <strong>
                    {orderType === "Dine-in"
                      ? "💵 Cash at Table / Counter"
                      : orderType === "Takeaway"
                      ? "💵 Cash on Counter Pickup"
                      : "💵 Cash on Delivery (COD)"}
                  </strong>
                  <p>Pay cash in person when receiving your dishes</p>
                </div>
              </label>

              <label className={`payment-method-label ${paymentMethod === "UPI" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="UPI"
                  checked={paymentMethod === "UPI"}
                  onChange={() => setPaymentMethod("UPI")}
                />
                <div>
                  <strong>📱 UPI Payment (GPay, PhonePe, Paytm, BHIM)</strong>
                  <p>
                    {orderType === "Dine-in"
                      ? "Scan table QR or pay cashier via UPI"
                      : orderType === "Takeaway"
                      ? "Pay via UPI at the pickup counter"
                      : "Pay delivery rider via UPI on arrival"}
                  </p>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", border: "1px dashed #cbd5e1" }}>
                    🧪 <strong>Test Mode:</strong> Select <em>UPI ID / VPA</em> in popup and enter <code>success@razorpay</code> or <code>failure@razorpay</code> to test without real money.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Placement */}
        <div className="place-order-right">
          <div className="cart-total-card">
            <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#1e293b" }}>Order Bill Summary</h2>

            <div className="bill-row">
              <span>Selected Dining Mode</span>
              <strong>{orderType}</strong>
            </div>

            {orderType === "Dine-in" && selectedTable && (
              <div className="bill-row">
                <span>Reserved Table</span>
                <strong style={{ color: "#047857" }}>🍽️ {selectedTable}</strong>
              </div>
            )}

            <div className="bill-row">
              <span>Dishes Subtotal</span>
              <span>₹ {subtotal}</span>
            </div>

            <div className="bill-row">
              <span>Delivery Charges</span>
              <span>{deliveryFee === 0 ? <strong style={{ color: "#16a34a" }}>FREE</strong> : `₹ ${deliveryFee}`}</span>
            </div>

            <hr style={{ margin: "14px 0", borderColor: "#f1f5f9" }} />

            <div className="bill-row total-row">
              <b>Final Amount Payable</b>
              <b style={{ color: "#ff6347", fontSize: "22px" }}>₹ {finalTotal}</b>
            </div>

            <div className="checkout-payment-pill">
              Payment Method: <strong>{paymentMethod}</strong> (Status: Pending)
            </div>

            <button type="submit" className="place-order-submit-btn" disabled={loading}>
              {loading ? "Placing Order..." : "PLACE ORDER NOW"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "12px" }}>
              🔒 Server calculates and validates final bill. Real-time kitchen dispatch.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;
