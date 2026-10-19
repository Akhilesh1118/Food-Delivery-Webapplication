import bcrypt from "bcryptjs";

// In-memory fallback store when MongoDB is not connected or offline
const initialFoods = [
  { _id: "1", name: "Greek salad", image: "food_1.png", price: 120, description: "Fresh cucumbers, tomatoes, olives, feta cheese with virgin olive oil", category: "Salad", isAvailable: true },
  { _id: "2", name: "Veg salad", image: "food_2.png", price: 180, description: "Crisp garden greens with lemon herb dressing", category: "Salad", isAvailable: true },
  { _id: "3", name: "Clover Salad", image: "food_3.png", price: 160, description: "Baby spinach, walnuts, clover sprouts and cranberries", category: "Salad", isAvailable: true },
  { _id: "4", name: "Chicken Salad", image: "food_4.png", price: 240, description: "Grilled herb chicken with bell peppers and honey mustard", category: "Salad", isAvailable: true },
  { _id: "5", name: "Lasagna Rolls", image: "food_5.png", price: 140, description: "Handcrafted pasta rolls stuffed with ricotta & marinara", category: "Rolls", isAvailable: true },
  { _id: "6", name: "Peri Peri Rolls", image: "food_6.png", price: 120, description: "Fiery peri peri spiced cottage cheese rolls", category: "Rolls", isAvailable: true },
  { _id: "7", name: "Chicken Rolls", image: "food_7.png", price: 200, description: "Smoky tandoori chicken chunks wrapped in flatbread", category: "Rolls", isAvailable: true },
  { _id: "8", name: "Veg Rolls", image: "food_8.png", price: 150, description: "Assorted spiced vegetables with mint chutney", category: "Rolls", isAvailable: true },
  { _id: "9", name: "Ripple Ice Cream", image: "food_9.png", price: 140, description: "Velvety vanilla swirled with raspberry ripples", category: "Deserts", isAvailable: true },
  { _id: "10", name: "Fruit Ice Cream", image: "food_10.png", price: 220, description: "Loaded with fresh mango, kiwi and strawberry chunks", category: "Deserts", isAvailable: true },
  { _id: "11", name: "Jar Ice Cream", image: "food_11.png", price: 100, description: "Decadent dark chocolate layered parfait in a mason jar", category: "Deserts", isAvailable: true },
  { _id: "12", name: "Vanilla Ice Cream", image: "food_12.png", price: 120, description: "Madagascar vanilla bean ice cream with caramel glaze", category: "Deserts", isAvailable: true },
  { _id: "13", name: "Chicken Sandwich", image: "food_13.png", price: 120, description: "Toasted sourdough with chicken breast, cheddar and aioli", category: "Sandwich", isAvailable: true },
  { _id: "14", name: "Vegan Sandwich", image: "food_14.png", price: 180, description: "Avocado, hummus, cucumber and alfalfa on rye bread", category: "Sandwich", isAvailable: true },
  { _id: "15", name: "Grilled Sandwich", image: "food_15.png", price: 160, description: "Three-cheese panini grilled to golden crispy perfection", category: "Sandwich", isAvailable: true },
  { _id: "16", name: "Bread Sandwich", image: "food_16.png", price: 240, description: "Double-decker club sandwich with fries", category: "Sandwich", isAvailable: true },
  { _id: "17", name: "Cup Cake", image: "food_17.png", price: 140, description: "Red velvet cupcake with vanilla bean cream cheese", category: "Cake", isAvailable: true },
  { _id: "18", name: "Vegan Cake", image: "food_18.png", price: 150, description: "Moist dark cacao sponge cake, 100% plant based", category: "Cake", isAvailable: true },
  { _id: "19", name: "Butterscotch Cake", image: "food_19.png", price: 200, description: "Rich sponge layered with crunchy butterscotch praline", category: "Cake", isAvailable: true },
  { _id: "20", name: "Sliced Cake", image: "food_20.png", price: 150, description: "Traditional British tea cake slice with almonds", category: "Cake", isAvailable: true },
  { _id: "21", name: "Garlic Mushroom", image: "food_21.png", price: 140, description: "Button mushrooms sautéed in garlic herb butter", category: "Pure Veg", isAvailable: true },
  { _id: "22", name: "Fried Cauliflower", image: "food_22.png", price: 220, description: "Crispy battered florets tossed in sweet chili garlic glaze", category: "Pure Veg", isAvailable: true },
  { _id: "23", name: "Mix Veg Pulao", image: "food_23.png", price: 100, description: "Fragrant basmati rice cooked with fresh seasonal veggies", category: "Pure Veg", isAvailable: true },
  { _id: "24", name: "Rice Zucchini", image: "food_24.png", price: 120, description: "Charred zucchini tossed with aromatic brown rice", category: "Pure Veg", isAvailable: true },
  { _id: "25", name: "Cheese Pasta", image: "food_25.png", price: 120, description: "Penne pasta in a rich velvety four-cheese sauce", category: "Pasta", isAvailable: true },
  { _id: "26", name: "Tomato Pasta", image: "food_26.png", price: 180, description: "Spaghetti in tangy San Marzano tomato & basil sauce", category: "Pasta", isAvailable: true },
  { _id: "27", name: "Creamy Pasta", image: "food_27.png", price: 160, description: "Fettuccine Alfredo tossed with parmesan and cracked pepper", category: "Pasta", isAvailable: true },
  { _id: "28", name: "Chicken Pasta", image: "food_28.png", price: 240, description: "Penne with roasted chicken chunks in pink vodka sauce", category: "Pasta", isAvailable: true },
  { _id: "29", name: "Butter Noodles", image: "food_29.png", price: 140, description: "Egg noodles tossed with browned butter and scallions", category: "Noodles", isAvailable: true },
  { _id: "30", name: "Veg Noodles", image: "food_30.png", price: 150, description: "Wok-tossed Hakka noodles with julienned vegetables", category: "Noodles", isAvailable: true },
  { _id: "31", name: "Somen Noodles", image: "food_31.png", price: 200, description: "Delicate Japanese chilled noodles with dipping sauce", category: "Noodles", isAvailable: true },
  { _id: "32", name: "Cooked Noodles", image: "food_32.png", price: 150, description: "Spicy Schezwan wok noodles with crispy shallots", category: "Noodles", isAvailable: true }
];

class InMemoryStore {
  constructor() {
    this.foods = [...initialFoods];
    this.users = new Map(); // email -> user
    this.usersById = new Map(); // id -> user
    this.carts = new Map(); // userId -> { [itemId]: quantity }
    this.orderSeq = 1000;
    this.orders = [];

    // Seed default admin and staff accounts
    this.seedUsers();
    // Seed initial POS sample orders
    this.seedOrders();
  }

  seedUsers() {
    const salt = bcrypt.genSaltSync(10);
    const adminUser = {
      _id: "user_admin_001",
      name: "Restaurant Manager",
      email: "admin@restaurant.com",
      password: bcrypt.hashSync("admin123", salt),
      role: "admin",
      cartData: {}
    };
    const staffUser = {
      _id: "user_staff_001",
      name: "Cashier Alex",
      email: "staff@restaurant.com",
      password: bcrypt.hashSync("staff123", salt),
      role: "staff",
      cartData: {}
    };
    const customerUser = {
      _id: "user_cust_001",
      name: "Rahul Verma",
      email: "customer@tomato.com",
      password: bcrypt.hashSync("customer123", salt),
      role: "customer",
      cartData: {}
    };
    this.users.set(adminUser.email.toLowerCase(), adminUser);
    this.usersById.set(adminUser._id, adminUser);
    this.users.set(staffUser.email.toLowerCase(), staffUser);
    this.usersById.set(staffUser._id, staffUser);
    this.users.set(customerUser.email.toLowerCase(), customerUser);
    this.usersById.set(customerUser._id, customerUser);
  }

  seedOrders() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 180 * 60 * 1000);

    this.orders = [
      {
        _id: "ord_init_1",
        orderNumber: "POS-1001",
        orderType: "Dine-in",
        tableNumber: "T-04",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        userId: "pos_guest",
        items: [
          { _id: "1", name: "Greek salad", price: 120, quantity: 2 },
          { _id: "25", name: "Cheese Pasta", price: 120, quantity: 1 }
        ],
        subtotal: 360,
        taxPercent: 5,
        tax: 18,
        discount: 0,
        amount: 378,
        address: {},
        paymentMethod: "UPI",
        paymentStatus: "Paid",
        payment: true,
        status: "Completed",
        date: threeHoursAgo
      },
      {
        _id: "ord_init_2",
        orderNumber: "POS-1002",
        orderType: "Takeaway",
        tableNumber: "",
        customerName: "Priya Patel",
        customerPhone: "9812345678",
        userId: "pos_guest",
        items: [
          { _id: "4", name: "Chicken Salad", price: 240, quantity: 1 },
          { _id: "13", name: "Chicken Sandwich", price: 120, quantity: 2 }
        ],
        subtotal: 480,
        taxPercent: 5,
        tax: 24,
        discount: 20,
        amount: 484,
        address: {},
        paymentMethod: "Card",
        paymentStatus: "Paid",
        payment: true,
        status: "Ready",
        date: twoHoursAgo
      },
      {
        _id: "ord_init_3",
        orderNumber: "POS-1003",
        orderType: "Dine-in",
        tableNumber: "T-02",
        customerName: "Vikram Mehta",
        customerPhone: "9944556677",
        userId: "pos_guest",
        items: [
          { _id: "27", name: "Creamy Pasta", price: 160, quantity: 2 },
          { _id: "9", name: "Ripple Ice Cream", price: 140, quantity: 2 }
        ],
        subtotal: 600,
        taxPercent: 5,
        tax: 30,
        discount: 0,
        amount: 630,
        address: {},
        paymentMethod: "Cash",
        paymentStatus: "Paid",
        payment: true,
        status: "Preparing",
        date: oneHourAgo
      },
      {
        _id: "ord_init_4",
        orderNumber: "POS-1004",
        orderType: "Dine-in",
        tableNumber: "T-06",
        customerName: "Ananya Roy",
        customerPhone: "9788990011",
        userId: "pos_guest",
        items: [
          { _id: "30", name: "Veg Noodles", price: 150, quantity: 2 },
          { _id: "6", name: "Peri Peri Rolls", price: 120, quantity: 2 }
        ],
        subtotal: 540,
        taxPercent: 5,
        tax: 27,
        discount: 0,
        amount: 567,
        address: {},
        paymentMethod: "UPI",
        paymentStatus: "Paid",
        payment: true,
        status: "Pending",
        date: now
      }
    ];
    this.orderSeq = 1004;
  }

  // Foods / Menu Management
  getFoods(category, search, availableOnly) {
    let result = this.foods;
    if (category && category !== "All") {
      result = result.filter(f => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }
    if (availableOnly) {
      result = result.filter(f => f.isAvailable !== false);
    }
    return result;
  }

  getFoodById(id) {
    return this.foods.find(f => f._id.toString() === id.toString()) || null;
  }

  addFood(food) {
    const newFood = {
      _id: food._id || Date.now().toString(),
      name: food.name,
      description: food.description || "",
      price: Number(food.price),
      category: food.category || "General",
      image: food.image || "food_1.png",
      isAvailable: food.isAvailable !== undefined ? Boolean(food.isAvailable) : true
    };
    this.foods.push(newFood);
    return newFood;
  }

  updateFood(id, updates) {
    const food = this.foods.find(f => f._id.toString() === id.toString());
    if (!food) return null;
    if (updates.name !== undefined) food.name = updates.name;
    if (updates.description !== undefined) food.description = updates.description;
    if (updates.price !== undefined) food.price = Number(updates.price);
    if (updates.category !== undefined) food.category = updates.category;
    if (updates.image !== undefined) food.image = updates.image;
    if (updates.isAvailable !== undefined) food.isAvailable = Boolean(updates.isAvailable);
    return food;
  }

  toggleFoodAvailability(id) {
    const food = this.foods.find(f => f._id.toString() === id.toString());
    if (!food) return null;
    food.isAvailable = !food.isAvailable;
    return food;
  }

  removeFood(id) {
    this.foods = this.foods.filter(f => f._id.toString() !== id.toString());
  }

  // Users & Access Control
  createUser({ name, email, password, role = "user" }) {
    const id = "user_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const user = {
      _id: id,
      name,
      email: email.toLowerCase(),
      password,
      role: role || "user",
      cartData: {}
    };
    this.users.set(email.toLowerCase(), user);
    this.usersById.set(id, user);
    return user;
  }

  findUserByEmail(email) {
    return this.users.get(email.toLowerCase()) || null;
  }

  findUserById(id) {
    return this.usersById.get(id) || null;
  }

  // Cart
  getCart(userId) {
    return this.carts.get(userId) || {};
  }

  addToCart(userId, itemId) {
    const cart = this.getCart(userId);
    cart[itemId] = (cart[itemId] || 0) + 1;
    this.carts.set(userId, { ...cart });
    return cart;
  }

  removeFromCart(userId, itemId) {
    const cart = this.getCart(userId);
    if (cart[itemId] > 0) {
      cart[itemId] -= 1;
    }
    this.carts.set(userId, { ...cart });
    return cart;
  }

  clearCart(userId) {
    this.carts.set(userId, {});
  }

  // Restaurant Tables Inventory
  getTableStatuses() {
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

    const activeOrders = this.orders.filter(o => 
      o.orderType === "Dine-in" && 
      ["Pending", "Preparing", "Ready"].includes(o.status) &&
      o.tableNumber
    );

    const occupiedMap = new Map();
    activeOrders.forEach(o => {
      occupiedMap.set(o.tableNumber, {
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status
      });
    });

    return RESTAURANT_TABLES.map(t => {
      const active = occupiedMap.get(t.tableNumber);
      return {
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        section: t.section,
        isAvailable: !active,
        occupiedBy: active || null
      };
    });
  }

  isTableAvailable(tableNumber) {
    const statuses = this.getTableStatuses();
    const table = statuses.find(t => t.tableNumber === tableNumber);
    return table ? table.isAvailable : false;
  }

  // Orders
  generateOrderNumber() {
    this.orderSeq += 1;
    return `TOM-${this.orderSeq}`;
  }

  addOrder(orderData) {
    const orderNumber = orderData.orderNumber || this.generateOrderNumber();
    const subtotal = Number(orderData.subtotal || 0);
    const taxPercent = Number(orderData.taxPercent !== undefined ? orderData.taxPercent : 5);
    const tax = Number(orderData.tax !== undefined ? orderData.tax : Math.round(subtotal * taxPercent / 100));
    const discount = Number(orderData.discount || 0);
    const deliveryFee = Number(orderData.deliveryFee || 0);
    const amount = Number(orderData.amount !== undefined ? orderData.amount : Math.max(0, subtotal + tax + deliveryFee - discount));

    const newOrder = {
      _id: orderData._id || ("ord_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
      orderNumber,
      orderType: orderData.orderType || "Dine-in",
      tableNumber: orderData.tableNumber || "",
      customerName: orderData.customerName || "Walk-in Customer",
      customerPhone: orderData.customerPhone || "",
      userId: orderData.userId || "pos_guest",
      items: orderData.items || [],
      subtotal,
      taxPercent,
      tax,
      discount,
      deliveryFee,
      amount,
      address: orderData.address || {},
      status: orderData.status || "Pending",
      paymentMethod: orderData.paymentMethod || "Cash",
      paymentStatus: orderData.paymentStatus || (orderData.payment ? "Paid" : "Pending"),
      payment: Boolean(orderData.payment !== undefined ? orderData.payment : (orderData.paymentStatus === "Paid")),
      razorpayOrderId: orderData.razorpayOrderId || "",
      razorpayPaymentId: orderData.razorpayPaymentId || "",
      razorpaySignature: orderData.razorpaySignature || "",
      paidAt: orderData.paidAt || (orderData.paymentStatus === "Paid" ? (orderData.date || new Date()) : null),
      date: orderData.date || new Date()
    };
    this.orders.unshift(newOrder);
    return newOrder;
  }

  getOrderById(id) {
    if (!id) return null;
    return this.orders.find(o => (o._id && o._id.toString() === id.toString()) || o.orderNumber === id || o.razorpayOrderId === id) || null;
  }

  getAllOrders({ status, search, orderType, includePendingPayment } = {}) {
    let result = this.orders;
    if (status && status !== "All") {
      result = result.filter(o => o.status.toLowerCase() === status.toLowerCase());
    } else if (!includePendingPayment) {
      result = result.filter(o => o.status !== "Payment Pending");
    }
    if (orderType && orderType !== "All") {
      result = result.filter(o => o.orderType.toLowerCase() === orderType.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q))
      );
    }
    return result;
  }

  getUserOrders(userId) {
    return this.orders.filter(o => o.userId === userId);
  }

  updateOrderStatus(orderId, status) {
    const order = this.orders.find(o => o._id.toString() === orderId.toString() || o.orderNumber === orderId || o.razorpayOrderId === orderId);
    if (order) {
      order.status = status;
    }
    return order;
  }

  recordPayment(orderId, paymentMethod, details = {}) {
    const order = this.orders.find(o => (o._id && o._id.toString() === orderId.toString()) || o.orderNumber === orderId || o.razorpayOrderId === orderId);
    if (order) {
      order.paymentMethod = paymentMethod || order.paymentMethod || "Cash";
      order.paymentStatus = "Paid";
      order.payment = true;
      order.paidAt = details.paidAt || new Date();
      if (details.razorpayPaymentId) order.razorpayPaymentId = details.razorpayPaymentId;
      if (details.razorpaySignature) order.razorpaySignature = details.razorpaySignature;
      if (details.razorpayOrderId) order.razorpayOrderId = details.razorpayOrderId;
      // If kitchen status was waiting for payment, transition to Pending (order received)
      if (order.status === "Payment Pending") {
        order.status = "Pending";
      }
    }
    return order;
  }

  normalizePaymentMethod(method) {
    if (!method) return "Cash";
    const m = method.toLowerCase();
    if (m.includes("upi") || m.includes("razorpay") || m.includes("gpay") || m.includes("phonepe") || m.includes("paytm")) return "UPI";
    if (m.includes("card") || m.includes("debit") || m.includes("credit") || m.includes("mastercard") || m.includes("visa")) return "Card";
    if (m.includes("cash") || m.includes("cod")) return "Cash";
    return "Other";
  }

  removeOrder(orderId) {
    this.orders = this.orders.filter(o => o._id.toString() !== orderId.toString() && o.orderNumber !== orderId);
  }

  // Reports & Daily Sales Summary (Idempotent calculation from all recorded orders)
  getDailySalesSummary() {
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

    const seenOrderKeys = new Set();

    this.orders.forEach(o => {
      const orderKey = o._id ? o._id.toString() : o.orderNumber;
      if (seenOrderKeys.has(orderKey)) return;
      seenOrderKeys.add(orderKey);

      const amt = Number(o.amount || 0);
      const isPaid = o.paymentStatus === "Paid" || o.payment === true;

      if (isPaid) {
        totalRevenue += amt;
        const normMethod = this.normalizePaymentMethod(o.paymentMethod);
        if (paymentBreakdown[normMethod]) {
          paymentBreakdown[normMethod].count += 1;
          paymentBreakdown[normMethod].amount += amt;
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

    return {
      success: true,
      data: {
        dailySales: totalRevenue,
        totalOrders: this.orders.length,
        completedOrders,
        activeOrders: pendingOrders + preparingOrders + readyOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        paymentPendingOrders,
        paymentBreakdown,
        recentOrders: this.orders.slice(0, 25)
      }
    };
  }
}

export const inMemoryStore = new InMemoryStore();
