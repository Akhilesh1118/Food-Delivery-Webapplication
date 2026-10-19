import React, { useContext, useEffect, useState } from 'react';
import "./MyOrder.css";
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { assets } from '../../assets/assets';
import { toast } from 'react-toastify';

const MyOrders = () => {
    const { url, token, clearCart } = useContext(StoreContext);
    const [data, setData] = useState([]);
    const [loadingRetry, setLoadingRetry] = useState(false);

    const fetchOrders = async () => {
        try {
            const response = await axios.post(url + "/api/order/userorders", {}, { headers: { token } });
            setData(response.data.data || []);
        } catch (err) {
            console.error("Error fetching user orders:", err);
        }
    };

    useEffect(() => {
        if (token) {
            fetchOrders();
        }
    }, [token]);

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

    const handleRetryPayment = async (order) => {
        try {
            setLoadingRetry(true);
            toast.info(`Initiating online checkout for Order #${order.orderNumber}...`);
            const retryRes = await axios.post(
                `${url}/api/order/retry-razorpay`,
                { orderId: order._id },
                { headers: { token } }
            );

            if (!retryRes.data.success) {
                toast.error(retryRes.data.message || "Failed to re-initiate payment");
                return;
            }

            const resData = retryRes.data;
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded || !window.Razorpay) {
                toast.error("Failed to load Razorpay SDK. Please check connection.");
                return;
            }

            const options = {
                key: resData.key,
                amount: resData.amount,
                currency: resData.currency || "INR",
                name: "Tomato Restaurant",
                description: `Retry Payment for Order #${resData.orderNumber}`,
                order_id: resData.razorpayOrderId,
                theme: { color: "#ff6347" },
                config: {
                    display: {
                        blocks: {
                            upi: {
                                name: "Pay via UPI (App, UPI ID or QR)",
                                instruments: [
                                    {
                                        method: "upi",
                                        flows: ["collect", "qr", "intent"]
                                    }
                                ]
                            },
                            other: {
                                name: "Cards, Netbanking & Other Methods",
                                instruments: [
                                    { method: "card" },
                                    { method: "netbanking" },
                                    { method: "wallet" }
                                ]
                            }
                        },
                        sequence: ["block.upi", "block.other"]
                    }
                },
                handler: async function (razorpayRes) {
                    try {
                        toast.info("Verifying Razorpay payment signature...");
                        const verifyRes = await axios.post(
                            `${url}/api/order/verify-razorpay`,
                            {
                                razorpay_order_id: razorpayRes.razorpay_order_id,
                                razorpay_payment_id: razorpayRes.razorpay_payment_id,
                                razorpay_signature: razorpayRes.razorpay_signature,
                                orderId: order._id
                            },
                            { headers: { token } }
                        );

                        if (verifyRes.data.success) {
                            if (clearCart) clearCart();
                            toast.success(`Payment verified! Order ${order.orderNumber} is now confirmed.`);
                            fetchOrders();
                        } else {
                            toast.error("Signature verification failed.");
                        }
                    } catch (err) {
                        console.error(err);
                        toast.error("Error verifying payment signature.");
                    }
                },
                modal: {
                    ondismiss: function () {
                        toast.warn("Payment modal closed. Order remains in Payment Pending status.");
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("Retry payment error:", err);
            toast.error(err.response?.data?.message || "Error re-initiating Razorpay payment");
        } finally {
            setLoadingRetry(false);
        }
    };

    return (
        <div className='my-orders'>
            <h2>My Orders</h2>
            <div className="container">
                {data.map((order, index) => {
                    const isPaid = order.paymentStatus === "Paid" || order.payment === true;
                    const isPendingPayment = !isPaid && (order.status === "Payment Pending" || order.paymentMethod === "UPI");
                    return (
                        <div key={order._id || index} className='my-orders-order'>
                            <img src={assets.parcel_icon} alt="" />
                            <p>{order.items.map((item, idx) => {
                                if (idx === order.items.length - 1) {
                                    return item.name + " x " + item.quantity;
                                } else {
                                    return item.name + " x " + item.quantity + ", ";
                                }
                            })}</p>
                            <p>&#8377; {order.amount}.00</p>
                            <p>Items: {order.items.length}</p>
                            <p style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>
                                    <span style={{ color: isPaid ? '#10b981' : '#d97706' }}>&#x25cf;</span>{' '}
                                    <strong style={{ color: isPaid ? '#10b981' : '#d97706', fontSize: '13px' }}>
                                        {isPaid ? `Paid (${order.paymentMethod || 'UPI'})` : 'Payment Pending'}
                                    </strong>
                                </span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    Kitchen: <b style={{ color: order.status === 'Completed' ? '#10b981' : '#3b82f6' }}>{order.status}</b>
                                </span>
                            </p>
                            {isPendingPayment ? (
                                <button
                                    onClick={() => handleRetryPayment(order)}
                                    disabled={loadingRetry}
                                    style={{ backgroundColor: '#ff6347', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    💳 Pay via UPI
                                </button>
                            ) : (
                                <button onClick={fetchOrders}>Track Order</button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MyOrders;
