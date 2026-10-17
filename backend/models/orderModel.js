import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    orderType: { type: String, enum: ['Dine-in', 'Takeaway', 'Delivery', 'Online Delivery'], default: 'Dine-in' },
    tableNumber: { type: String, default: '' },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    userId: { type: String, default: 'pos_guest' },
    items: { type: Array, required: true },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 5 },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    address: { type: Object, default: {} },
    paymentMethod: { type: String, default: 'Cash' },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending' },
    payment: { type: Boolean, default: false },
    status: { type: String, enum: ['Payment Pending', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'], default: 'Pending' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    paidAt: { type: Date },
    date: { type: Date, default: Date.now }
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
