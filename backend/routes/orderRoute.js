import express from "express";
import authMiddleware, { requireStaffOrAdmin } from "../middleware/auth.js";
import {
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
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Restaurant Tables & Availability (Public reading for Dine-in checkout & POS)
orderRouter.get("/tables", getTableStatuses);
orderRouter.get("/tables/status", getTableStatuses);
orderRouter.get("/razorpay-key", getRazorpayKey);
orderRouter.post("/webhook-razorpay", express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// Staff & Admin POS Order Management (Protected by requireStaffOrAdmin)
orderRouter.post("/", authMiddleware, requireStaffOrAdmin, createOrder);
orderRouter.get("/", authMiddleware, requireStaffOrAdmin, listOrders);
orderRouter.get("/list", authMiddleware, requireStaffOrAdmin, listOrders);
orderRouter.get("/reports/daily-sales", authMiddleware, requireStaffOrAdmin, getDailySales);
// Customer Online Orders & Razorpay Integration
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/verify", verifyOrder);
orderRouter.post("/verify-razorpay", authMiddleware, verifyRazorpayPayment);
orderRouter.post("/retry-razorpay", authMiddleware, retryRazorpayOrder);
orderRouter.post("/userorders", authMiddleware, userOrders);

// Staff status & payment recording routes
orderRouter.patch("/status", authMiddleware, requireStaffOrAdmin, updateStatus);
orderRouter.post("/status", authMiddleware, requireStaffOrAdmin, updateStatus);
orderRouter.post("/payment", authMiddleware, requireStaffOrAdmin, recordPayment);

// Parameterized ID routes (must be placed at the bottom)
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.patch("/:id/status", authMiddleware, requireStaffOrAdmin, updateStatus);
orderRouter.post("/:id/status", authMiddleware, requireStaffOrAdmin, updateStatus);
orderRouter.post("/:id/payment", authMiddleware, requireStaffOrAdmin, recordPayment);

export default orderRouter;
