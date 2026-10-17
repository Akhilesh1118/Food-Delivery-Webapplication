import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";
import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import { inMemoryStore } from "../config/inMemoryStore.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    try {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    } catch (e) {
        console.warn("Stripe init failed:", e.message);
    }
}

// Helper to look up food item details & availability
const getMenuItem = async (id) => {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
        try {
            const item = await foodModel.findById(id);
            if (item) return item;
        } catch (e) {
            // fallback
        }
    }
    return inMemoryStore.getFoodById(id);
};

// 1. Create Order (POS / In-Store with Server Calculation & Validation)
const createOrder = async (req, res) => {
    try {
        const {
            items,
            orderType = "Dine-in",
            tableNumber = "",
            customerName = "Walk-in Customer",
            customerPhone = "",
            taxPercent = 5,
            discount = 0,
            paymentMethod = "Cash",
            paymentStatus = "Paid"
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Order must contain at least one item" });
        }

        // Server-side validation: verify each item exists and is available
        const validatedItems = [];
        let calculatedSubtotal = 0;

        for (const reqItem of items) {
            const menuItem = await getMenuItem(reqItem._id || reqItem.id);
            if (!menuItem) {
                return res.status(400).json({
                    success: false,
                    message: `Item "${reqItem.name || reqItem._id}" not found in menu`
                });
            }

            // Check availability rule: Unavailable menu items must not be added to new orders
            if (menuItem.isAvailable === false) {
                return res.status(400).json({
                    success: false,
                    message: `"${menuItem.name}" is currently Out of Stock / Unavailable`
                });
            }

            const quantity = Math.max(1, parseInt(reqItem.quantity || 1, 10));
            const itemPrice = Number(menuItem.price);
            calculatedSubtotal += itemPrice * quantity;

            validatedItems.push({
                _id: menuItem._id.toString(),
                name: menuItem.name,
                price: itemPrice,
                category: menuItem.category,
                quantity: quantity
            });
        }

        // Server-side calculation of billing amounts
        const safeTaxPercent = Math.max(0, Number(taxPercent || 5));
        const calculatedTax = Math.round((calculatedSubtotal * safeTaxPercent) / 100);
        const safeDiscount = Math.max(0, Number(discount || 0));
        const finalAmount = Math.max(0, calculatedSubtotal + calculatedTax - safeDiscount);

        const orderNumber = inMemoryStore.generateOrderNumber();
        const isPaid = paymentStatus === "Paid";

        const orderData = {
            orderNumber,
            orderType,
            tableNumber: orderType === "Dine-in" ? (tableNumber || "T-01") : "",
            customerName: customerName || "Walk-in Customer",
            customerPhone: customerPhone || "",
            userId: req.body.userId || "pos_staff",
            items: validatedItems,
            subtotal: calculatedSubtotal,
            taxPercent: safeTaxPercent,
            tax: calculatedTax,
            discount: safeDiscount,
            amount: finalAmount,
            address: req.body.address || {},
            paymentMethod,
            paymentStatus: isPaid ? "Paid" : "Pending",
            payment: isPaid,
            status: "Pending",
            date: new Date()
        };

        let savedOrder;
        if (isDbConnected()) {
            const newOrder = new orderModel(orderData);
            savedOrder = await newOrder.save();
            inMemoryStore.addOrder({ ...orderData, _id: savedOrder._id.toString() });
        } else {
            savedOrder = inMemoryStore.addOrder(orderData);
        }

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: savedOrder,
            orderNumber: savedOrder.orderNumber
        });

    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create order" });
    }
};

// 2. List Orders (with filters by status, orderType, search query)
const listOrders = async (req, res) => {
    try {
        const { status, search, orderType, includePendingPayment } = req.query;

        if (isDbConnected()) {
            let filter = {};
            if (status && status !== "All") {
                filter.status = status;
            } else if (!includePendingPayment) {
                filter.status = { $ne: "Payment Pending" };
            }
            if (orderType && orderType !== "All") filter.orderType = orderType;
            if (search && search.trim()) {
                filter.$or = [
                    { orderNumber: { $regex: search.trim(), $options: "i" } },
                    { customerName: { $regex: search.trim(), $options: "i" } },
                    { tableNumber: { $regex: search.trim(), $options: "i" } },
                    { customerPhone: { $regex: search.trim(), $options: "i" } }
                ];
            }
            const orders = await orderModel.find(filter).sort({ date: -1 });
            if (orders && orders.length > 0) {
                return res.json({ success: true, data: orders });
            }
        }

        const orders = inMemoryStore.getAllOrders({ status, search, orderType, includePendingPayment });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("List orders error:", error);
        res.json({ success: true, data: inMemoryStore.getAllOrders(req.query) });
    }
};

// 3. Get Single Order by ID or Order Number
const getOrderById = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Order ID required" });

        if (isDbConnected()) {
            const order = await orderModel.findOne({
                $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { orderNumber: id }]
            });
            if (order) return res.json({ success: true, data: order });
        }

        const order = inMemoryStore.getOrderById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        res.json({ success: true, data: order });
    } catch (error) {
        console.error("Get order error:", error);
        res.status(500).json({ success: false, message: "Error fetching order details" });
    }
};

// 4. Update Order Status (Pending -> Preparing -> Ready -> Completed -> Cancelled)
const updateStatus = async (req, res) => {
    try {
        const orderId = req.params.id || req.body.orderId || req.body.id;
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        let status = req.body.status;
        if (status === "Food Processing") status = "Preparing";
        else if (status === "Out for delivery") status = "Ready";
        else if (status === "Delivered") status = "Completed";

        const validStatuses = ["Pending", "Preparing", "Ready", "Completed", "Cancelled", "Food Processing", "Out for delivery", "Delivered"];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
        }

        if (isDbConnected()) {
            const updated = await orderModel.findOneAndUpdate(
                { $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderNumber: orderId }] },
                { status },
                { new: true }
            );
            inMemoryStore.updateOrderStatus(orderId, status);
            return res.json({ success: true, message: "Status Updated", data: updated });
        }

        const updated = inMemoryStore.updateOrderStatus(orderId, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.json({ success: true, message: "Status Updated", data: updated });
    } catch (error) {
        console.error("Update status error:", error);
        res.status(500).json({ success: false, message: "Error updating order status" });
    }
};

// 5. Record Payment (Cash, UPI, Card)
const recordPayment = async (req, res) => {
    try {
        const orderId = req.params.id || req.body.orderId;
        const { paymentMethod = "Cash" } = req.body;

        if (isDbConnected()) {
            const updated = await orderModel.findOneAndUpdate(
                { $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderNumber: orderId }] },
                { paymentMethod, paymentStatus: "Paid", payment: true },
                { new: true }
            );
            inMemoryStore.recordPayment(orderId, paymentMethod);
            return res.json({ success: true, message: `Payment of recorded via ${paymentMethod}`, data: updated });
        }

        const updated = inMemoryStore.recordPayment(orderId, paymentMethod);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.json({ success: true, message: `Payment recorded via ${paymentMethod}`, data: updated });
    } catch (error) {
        console.error("Record payment error:", error);
        res.status(500).json({ success: false, message: "Error recording payment" });
    }
};

// 6. Daily Sales Summary & Reports
const getDailySales = async (req, res) => {
    try {
        if (isDbConnected()) {
            const orders = await orderModel.find({}).sort({ date: -1 });
            let totalRevenue = 0;
            let completedOrders = 0;
            let pendingOrders = 0;
            let preparingOrders = 0;
            let readyOrders = 0;
            let paymentPendingOrders = 0;

            const paymentBreakdown = {
                Cash: { count: 0, amount: 0 },
                UPI: { count: 0, amount: 0 },
                Card: { count: 0, amount: 0 },
                Other: { count: 0, amount: 0 }
            };

            const seenKeys = new Set();
            orders.forEach(o => {
                const key = o._id ? o._id.toString() : o.orderNumber;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);

                const amt = Number(o.amount || 0);
                const isPaid = o.paymentStatus === "Paid" || o.payment === true;

                if (isPaid) {
                    totalRevenue += amt;
                    const method = inMemoryStore.normalizePaymentMethod(o.paymentMethod);
                    if (paymentBreakdown[method]) {
                        paymentBreakdown[method].count += 1;
                        paymentBreakdown[method].amount += amt;
                    } else {
                        paymentBreakdown.Other.count += 1;
                        paymentBreakdown.Other.amount += amt;
                    }
                }

                if (o.status === "Completed") completedOrders += 1;
                else if (o.status === "Pending") pendingOrders += 1;
                else if (o.status === "Preparing") preparingOrders += 1;
                else if (o.status === "Ready") readyOrders += 1;
                else if (o.status === "Payment Pending") paymentPendingOrders += 1;
            });

            return res.json({
                success: true,
                data: {
                    dailySales: totalRevenue,
                    totalOrders: orders.length,
                    completedOrders,
                    activeOrders: pendingOrders + preparingOrders + readyOrders,
                    pendingOrders,
                    preparingOrders,
                    readyOrders,
                    paymentPendingOrders,
                    paymentBreakdown,
                    recentOrders: orders.slice(0, 25)
                }
            });
        }

        const summary = inMemoryStore.getDailySalesSummary();
        res.json(summary);
    } catch (error) {
        console.error("Daily sales report error:", error);
        res.status(500).json({ success: false, message: "Error generating sales summary" });
    }
};

// 7. Get Table Statuses (Dine-in Inventory & Real-Time Availability)
const getTableStatuses = async (req, res) => {
    try {
        const RESTAURANT_TABLES = [
            { tableNumber: "T-01", capacity: 2, section: "Window" },
            { tableNumber: "T-02", capacity: 4, section: "Main Hall" },
            { tableNumber: "T-03", capacity: 2, section: "Main Hall" },
            { tableNumber: "T-04", capacity: 4, section: "Booth" },
            { tableNumber: "T-05", capacity: 6, section: "Family Area" },
            { tableNumber: "T-06", capacity: 4, section: "Main Hall" },
            { tableNumber: "T-07", capacity: 2, section: "Window" },
            { tableNumber: "T-08", capacity: 8, section: "Party Lounge" }
        ];

        if (isDbConnected()) {
            const activeOrders = await orderModel.find({
                orderType: "Dine-in",
                status: { $in: ["Pending", "Preparing", "Ready"] },
                tableNumber: { $ne: "" }
            });

            const occupiedMap = new Map();
            activeOrders.forEach(o => {
                occupiedMap.set(o.tableNumber, {
                    orderNumber: o.orderNumber,
                    customerName: o.customerName,
                    status: o.status
                });
            });

            const tables = RESTAURANT_TABLES.map(t => {
                const active = occupiedMap.get(t.tableNumber);
                return {
                    tableNumber: t.tableNumber,
                    capacity: t.capacity,
                    section: t.section,
                    isAvailable: !active,
                    occupiedBy: active || null
                };
            });

            return res.json({ success: true, data: tables });
        }

        const tables = inMemoryStore.getTableStatuses();
        return res.json({ success: true, data: tables });
    } catch (error) {
        console.error("Get tables error:", error);
        res.status(500).json({ success: false, message: "Error fetching table statuses" });
    }
};

// 8. Place order for Customer Website (Supports Dine-in, Takeaway, Delivery with Razorpay UPI)
const placeOrder = async (req, res) => {
    try {
        const {
            items,
            orderType = "Delivery",
            tableNumber = "",
            customerName = "",
            customerPhone = "",
            address = {},
            paymentMethod = "Cash"
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty. Please add items before checkout." });
        }

        // Validate Order Type
        const validOrderTypes = ["Dine-in", "Takeaway", "Delivery", "Online Delivery"];
        const normalizedOrderType = validOrderTypes.includes(orderType) ? (orderType === "Online Delivery" ? "Delivery" : orderType) : "Delivery";

        // Validate Dine-in Table
        if (normalizedOrderType === "Dine-in") {
            if (!tableNumber) {
                return res.status(400).json({ success: false, message: "Please select an available dining table." });
            }

            const validTableNumbers = ["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07", "T-08"];
            if (!validTableNumbers.includes(tableNumber)) {
                return res.status(400).json({ success: false, message: `Invalid table number "${tableNumber}". Please choose a table between T-01 and T-08.` });
            }

            // Backend validation: Table availability check
            let isOccupied = false;
            if (isDbConnected()) {
                const existing = await orderModel.findOne({
                    orderType: "Dine-in",
                    tableNumber,
                    status: { $in: ["Pending", "Preparing", "Ready"] }
                });
                if (existing) isOccupied = true;
            } else {
                isOccupied = !inMemoryStore.isTableAvailable(tableNumber);
            }

            if (isOccupied) {
                return res.status(400).json({
                    success: false,
                    message: `Table ${tableNumber} is currently occupied. Please select an available table.`
                });
            }
        }

        // Validate Delivery Address
        if (normalizedOrderType === "Delivery") {
            if (!address.street || !address.city || !address.zipcode) {
                return res.status(400).json({ success: false, message: "Please provide a complete delivery address (street, city, zip code)." });
            }
        }

        // Server validation of items, prices & availability
        let validatedSubtotal = 0;
        const validatedItems = [];
        for (const reqItem of items) {
            const menuItem = await getMenuItem(reqItem._id || reqItem.id);
            if (!menuItem) {
                return res.status(400).json({ success: false, message: `Item "${reqItem.name || reqItem._id}" not found in menu` });
            }
            if (menuItem.isAvailable === false) {
                return res.status(400).json({ success: false, message: `"${menuItem.name}" is currently Out of Stock` });
            }
            const qty = Math.max(1, parseInt(reqItem.quantity || 1, 10));
            validatedSubtotal += Number(menuItem.price) * qty;
            validatedItems.push({
                _id: menuItem._id.toString(),
                name: menuItem.name,
                price: Number(menuItem.price),
                category: menuItem.category,
                quantity: qty
            });
        }

        // Delivery fee: ₹50 only for Delivery, ₹0 for Dine-in and Takeaway
        const isDelivery = normalizedOrderType === "Delivery";
        const deliveryFee = isDelivery ? 50 : 0;
        const calculatedTotal = validatedSubtotal + deliveryFee;

        // Label Payment Method accurately
        let finalPaymentMethod = paymentMethod || "Cash";
        if (finalPaymentMethod.toLowerCase().includes("cash") || finalPaymentMethod === "COD") {
            finalPaymentMethod = "Cash";
        } else if (finalPaymentMethod.toLowerCase().includes("upi")) {
            finalPaymentMethod = "UPI";
        }

        const isUpi = finalPaymentMethod === "UPI";
        const initialStatus = isUpi ? "Payment Pending" : "Pending";
        const orderNumber = inMemoryStore.generateOrderNumber();
        const customerDisplayName = customerName || (address.firstName ? `${address.firstName} ${address.lastName || ''}`.trim() : "Valued Customer");
        const customerDisplayPhone = customerPhone || address.phone || "";

        const orderData = {
            orderNumber,
            orderType: normalizedOrderType,
            tableNumber: normalizedOrderType === "Dine-in" ? tableNumber : "",
            customerName: customerDisplayName,
            customerPhone: customerDisplayPhone,
            userId: req.body.userId || req.user?.id || "customer_guest",
            items: validatedItems,
            subtotal: validatedSubtotal,
            taxPercent: 0,
            tax: 0,
            discount: 0,
            deliveryFee,
            amount: calculatedTotal,
            address: isDelivery ? address : {},
            status: initialStatus,
            payment: false,
            paymentStatus: "Pending",
            paymentMethod: finalPaymentMethod,
            date: new Date()
        };

        let savedOrder;
        if (isDbConnected()) {
            const newOrder = new orderModel(orderData);
            savedOrder = await newOrder.save();
            inMemoryStore.addOrder({ ...orderData, _id: savedOrder._id.toString() });
        } else {
            savedOrder = inMemoryStore.addOrder(orderData);
        }

        // Handle Razorpay UPI Order Creation
        if (isUpi) {
            const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
            const key_secret = process.env.RAZORPAY_KEY_SECRET;

            if (!key_id || !key_secret) {
                return res.status(400).json({
                    success: false,
                    message: "Razorpay server credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing. Please configure them in your server environment."
                });
            }

            const razorpay = new Razorpay({ key_id, key_secret });
            const amountInPaise = Math.round(calculatedTotal * 100);

            let rzpOrder;
            try {
                rzpOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: "INR",
                    receipt: savedOrder.orderNumber,
                    notes: {
                        orderId: savedOrder._id.toString(),
                        orderNumber: savedOrder.orderNumber
                    }
                });
            } catch (rzpErr) {
                console.error("[Razorpay SDK Error]:", rzpErr);
                return res.status(500).json({
                    success: false,
                    message: `Razorpay order creation failed: ${rzpErr.error?.description || rzpErr.message || "Invalid Razorpay credentials or API error"}`
                });
            }

            if (isDbConnected()) {
                await orderModel.findByIdAndUpdate(savedOrder._id, { razorpayOrderId: rzpOrder.id });
            } else {
                savedOrder.razorpayOrderId = rzpOrder.id;
            }

            return res.status(201).json({
                success: true,
                requiresRazorpay: true,
                message: "Razorpay online payment initiated",
                orderId: savedOrder._id.toString(),
                orderNumber: savedOrder.orderNumber,
                razorpayOrderId: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency || "INR",
                key: key_id,
                data: savedOrder
            });
        }

        // Cash / COD: Clear cart immediately and confirm
        const targetUserId = req.body.userId || req.user?.id;
        if (targetUserId && targetUserId !== "customer_guest") {
            if (isDbConnected() && mongoose.Types.ObjectId.isValid(targetUserId)) {
                await userModel.findByIdAndUpdate(targetUserId, { cartData: {} });
            }
            inMemoryStore.clearCart(targetUserId);
        }

        return res.status(201).json({
            success: true,
            requiresRazorpay: false,
            message: "Order placed successfully",
            orderId: savedOrder._id.toString(),
            orderNumber: savedOrder.orderNumber,
            data: savedOrder,
            session_url: `/verify?success=true&orderId=${savedOrder._id.toString()}&orderNumber=${savedOrder.orderNumber}`
        });

    } catch (error) {
        console.error("Place order error:", error);
        res.status(500).json({ success: false, message: error.message || "Error placing order" });
    }
};

// 9. Secure Server-side Razorpay Signature Verification
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay payment verification parameters."
            });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_secret_12345";
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        // Strictly verify HMAC-SHA256 signature without fake shortcuts
        const isValid = generatedSignature === razorpay_signature;

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay payment signature. Verification failed."
            });
        }

        // Look up associated order by stable order ID, razorpayOrderId, or orderNumber
        let order = null;
        if (isDbConnected()) {
            order = await orderModel.findOne({
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null },
                    { razorpayOrderId: razorpay_order_id },
                    { orderNumber: orderId }
                ]
            });
        } else {
            order = inMemoryStore.getOrderById(orderId) || inMemoryStore.getOrderById(razorpay_order_id);
        }

        if (!order) {
            return res.status(404).json({ success: false, message: "Associated order not found." });
        }

        // Idempotency: If already verified and paid, return existing confirmed order without duplicate processing
        if (order.paymentStatus === "Paid" && (order.payment === true)) {
            return res.json({
                success: true,
                message: "Razorpay payment already verified for this order.",
                data: order
            });
        }

        // Keep payment status separate from kitchen fulfilment status:
        // Only advance from 'Payment Pending' to 'Pending' (Order received, awaiting kitchen).
        // If kitchen has already moved order to Preparing/Ready/Completed, preserve it.
        const targetStatus = order.status === "Payment Pending" ? "Pending" : order.status;
        const now = new Date();

        const updateFields = {
            payment: true,
            paymentStatus: "Paid",
            paymentMethod: "UPI",
            status: targetStatus,
            paidAt: now,
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpaySignature: razorpay_signature
        };

        let updatedOrder;
        if (isDbConnected()) {
            if (mongoose.Types.ObjectId.isValid(order._id)) {
                updatedOrder = await orderModel.findByIdAndUpdate(order._id, updateFields, { new: true });
            } else {
                updatedOrder = await orderModel.findOneAndUpdate(
                    { $or: [{ razorpayOrderId: razorpay_order_id }, { orderNumber: order.orderNumber }] },
                    updateFields,
                    { new: true }
                );
            }
            inMemoryStore.recordPayment(order._id.toString(), "UPI", {
                paidAt: now,
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpaySignature: razorpay_signature
            });
            inMemoryStore.updateOrderStatus(order._id.toString(), targetStatus);
        } else {
            order.payment = true;
            order.paymentStatus = "Paid";
            order.paymentMethod = "UPI";
            order.status = targetStatus;
            order.paidAt = now;
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpayOrderId = razorpay_order_id;
            order.razorpaySignature = razorpay_signature;
            updatedOrder = order;
        }

        // Clear user cart upon verified payment
        const userId = req.body.userId || req.user?.id || order.userId;
        if (userId && userId !== "customer_guest") {
            if (isDbConnected() && mongoose.Types.ObjectId.isValid(userId)) {
                await userModel.findByIdAndUpdate(userId, { cartData: {} });
            }
            inMemoryStore.clearCart(userId);
        }

        return res.json({
            success: true,
            message: "Razorpay payment verified and order confirmed successfully!",
            data: updatedOrder
        });

    } catch (error) {
        console.error("Verify Razorpay payment error:", error);
        return res.status(500).json({ success: false, message: error.message || "Error verifying payment" });
    }
};

// 10. Webhook Handler for Delayed & Asynchronous Razorpay Events (Idempotent & Signature-Verified)
const handleRazorpayWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            return res.status(400).json({ success: false, message: "Missing Razorpay webhook signature header" });
        }

        // Capture raw body for exact cryptographic HMAC verification
        const rawBody = req.rawBody ? req.rawBody : (Buffer.isBuffer(req.body) ? req.body : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)));
        
        if (webhookSecret) {
            const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
            if (signature !== expectedSignature) {
                return res.status(400).json({ success: false, message: "Invalid webhook signature" });
            }
        }

        const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (!event || !event.event) {
            return res.status(400).json({ success: false, message: "Invalid webhook payload structure" });
        }

        // 1. Successful payment events: payment.captured or order.paid
        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const payload = event.payload?.payment?.entity || event.payload?.order?.entity;
            const razorpayOrderId = payload?.order_id || payload?.id;

            if (razorpayOrderId) {
                let existingOrder = null;
                if (isDbConnected()) {
                    existingOrder = await orderModel.findOne({
                        $or: [
                            { razorpayOrderId },
                            { _id: mongoose.Types.ObjectId.isValid(payload?.notes?.orderId) ? payload.notes.orderId : null },
                            { orderNumber: payload?.notes?.orderNumber || payload?.receipt }
                        ]
                    });
                } else {
                    existingOrder = inMemoryStore.getOrderById(razorpayOrderId) || 
                                  inMemoryStore.getOrderById(payload?.notes?.orderId) || 
                                  inMemoryStore.getOrderById(payload?.receipt);
                }

                // Idempotency: If already paid, do not re-update or alter state
                if (existingOrder && existingOrder.paymentStatus === 'Paid' && existingOrder.payment === true) {
                    return res.status(200).json({ status: "ok", message: "Event already processed idempotently" });
                }

                const targetStatus = (existingOrder && existingOrder.status !== "Payment Pending") ? existingOrder.status : "Pending";
                const now = new Date();

                if (isDbConnected()) {
                    await orderModel.findOneAndUpdate(
                        { 
                          $or: [
                            { razorpayOrderId },
                            { _id: mongoose.Types.ObjectId.isValid(payload?.notes?.orderId) ? payload.notes.orderId : null },
                            { orderNumber: payload?.notes?.orderNumber || payload?.receipt }
                          ]
                        },
                        { 
                            payment: true, 
                            paymentStatus: "Paid", 
                            paymentMethod: "UPI", 
                            status: targetStatus, 
                            paidAt: now,
                            razorpayPaymentId: payload?.id || '' 
                        }
                    );
                }
                
                if (existingOrder) {
                    existingOrder.payment = true;
                    existingOrder.paymentStatus = "Paid";
                    existingOrder.paymentMethod = "UPI";
                    existingOrder.status = targetStatus;
                    existingOrder.paidAt = now;
                    existingOrder.razorpayPaymentId = payload?.id || '';
                }
            }
        } 
        // 2. Failed payment events: payment.failed
        else if (event.event === 'payment.failed') {
            const payload = event.payload?.payment?.entity;
            const razorpayOrderId = payload?.order_id;

            if (razorpayOrderId) {
                if (isDbConnected()) {
                    await orderModel.findOneAndUpdate(
                        { razorpayOrderId, paymentStatus: { $ne: "Paid" } },
                        { paymentStatus: "Failed" }
                    );
                }
                const order = inMemoryStore.getOrderById(razorpayOrderId);
                if (order && order.paymentStatus !== "Paid") {
                    order.paymentStatus = "Failed";
                }
            }
        }

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("Razorpay webhook error:", error);
        return res.status(500).json({ success: false, message: error.message || "Webhook handler error" });
    }
};

// 11. Razorpay Public Key Endpoint
const getRazorpayKey = async (req, res) => {
    const key = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    if (!key) {
        return res.status(400).json({ success: false, message: "RAZORPAY_KEY_ID is not configured on the server." });
    }
    return res.json({ success: true, key });
};

// 12. Retry Payment for Existing Pending Order
const retryRazorpayOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: "Order ID is required" });

        let order = null;
        if (isDbConnected()) {
            order = await orderModel.findById(orderId);
        } else {
            order = inMemoryStore.getOrderById(orderId);
        }

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.paymentStatus === "Paid") {
            return res.status(400).json({ success: false, message: "Order is already paid" });
        }

        const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            return res.status(400).json({
                success: false,
                message: "Razorpay server credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing."
            });
        }

        const razorpay = new Razorpay({ key_id, key_secret });
        const amountInPaise = Math.round(Number(order.amount) * 100);

        let rzpOrder;
        try {
            rzpOrder = await razorpay.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: order.orderNumber,
                notes: {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber
                }
            });
        } catch (rzpErr) {
            console.error("[Razorpay Retry SDK Error]:", rzpErr);
            return res.status(500).json({
                success: false,
                message: `Failed to create Razorpay retry order: ${rzpErr.error?.description || rzpErr.message || "Invalid Razorpay API response"}`
            });
        }

        if (isDbConnected()) {
            await orderModel.findByIdAndUpdate(order._id, { razorpayOrderId: rzpOrder.id });
        } else {
            order.razorpayOrderId = rzpOrder.id;
        }

        return res.json({
            success: true,
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || "INR",
            key: key_id
        });
    } catch (error) {
        console.error("Retry Razorpay order error:", error);
        return res.status(500).json({ success: false, message: error.message || "Error retrying payment" });
    }
};

// 13. Verify Cash / In-store Confirmation Status (Never marks online order as paid without signature)
const verifyOrder = async (req, res) => {
    const { orderId } = req.body;
    try {
        let order = null;
        if (isDbConnected()) {
            order = await orderModel.findOne({
                $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderNumber: orderId }]
            });
        } else {
            order = inMemoryStore.getOrderById(orderId);
        }

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        return res.json({
            success: true,
            message: "Order status fetched",
            data: order
        });
    } catch (error) {
        console.error("Verify order error:", error);
        res.status(500).json({ success: false, message: "Error verifying order" });
    }
};

const userOrders = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        if (isDbConnected()) {
            const orders = await orderModel.find({ userId }).sort({ date: -1 });
            if (orders && orders.length > 0) {
                return res.json({ success: true, data: orders });
            }
        }
        res.json({ success: true, data: inMemoryStore.getUserOrders(userId) });
    } catch (error) {
        console.error("User orders error:", error);
        res.status(500).json({ success: false, message: "Error fetching user orders" });
    }
};

export {
    createOrder,
    listOrders,
    getOrderById,
    updateStatus,
    recordPayment,
    getDailySales,
    getTableStatuses,
    placeOrder,
    verifyOrder,
    userOrders,
    verifyRazorpayPayment,
    handleRazorpayWebhook,
    getRazorpayKey,
    retryRazorpayOrder
};