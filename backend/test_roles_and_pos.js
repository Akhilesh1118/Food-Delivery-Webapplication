import 'dotenv/config';
import axios from 'axios';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function runTests() {
  console.log('--- STARTING TOMATO COMPREHENSIVE INTEGRATION & RBAC TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Public Registration: ensure role is strictly "customer"
    console.log('\n[1] Testing Public Registration Security...');
    const testCustomerEmail = `customer_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Customer',
      email: testCustomerEmail,
      password: 'password123',
      role: 'admin' // Attempt privilege escalation
    });

    assert(regRes.data.success === true, 'Customer registered successfully');
    assert(regRes.data.user.role === 'customer', 'Public registration strictly enforced "customer" role, ignoring requested "admin" role');
    const customerToken = regRes.data.token;
    const customerUserId = regRes.data.user.id;

    // 2. Test Staff Login
    console.log('\n[2] Testing Staff Login...');
    const staffLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'staff@restaurant.com',
      password: 'staff123'
    });
    assert(staffLoginRes.data.success === true, 'Staff logged in successfully');
    assert(staffLoginRes.data.user.role === 'staff', 'Staff user verified with role "staff"');
    const staffToken = staffLoginRes.data.token;

    // 3. Test Admin Login
    console.log('\n[3] Testing Admin Login...');
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/admin/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    assert(adminLoginRes.data.success === true, 'Admin logged in successfully');
    assert(adminLoginRes.data.user.role === 'admin', 'Admin user verified with role "admin"');
    const adminToken = adminLoginRes.data.token;

    // 4. Test RBAC on Admin-Only Menu Management
    console.log('\n[4] Testing RBAC on Menu Administration...');
    // Customer trying to create menu item
    try {
      await axios.post(`${BASE_URL}/api/menu`, {
        name: 'Hacked Item',
        price: 99,
        category: 'Salad',
        image: 'food_1.png'
      }, { headers: { token: customerToken } });
      assert(false, 'Customer should NOT be allowed to create menu items');
    } catch (err) {
      assert(err.response?.status === 403, 'Customer blocked from menu creation with 403 Forbidden');
    }

    // Staff trying to create menu item
    try {
      await axios.post(`${BASE_URL}/api/menu`, {
        name: 'Staff Unauthorized Item',
        price: 99,
        category: 'Salad',
        image: 'food_1.png'
      }, { headers: { token: staffToken } });
      assert(false, 'Staff should NOT be allowed to create menu items');
    } catch (err) {
      assert(err.response?.status === 403, 'Staff blocked from menu creation with 403 Forbidden');
    }

    // Admin creating menu item
    const addDishRes = await axios.post(`${BASE_URL}/api/menu`, {
      name: 'Chef Special Pasta',
      price: 250,
      category: 'Pasta',
      description: 'Handmade fettuccine in creamy truffle sauce',
      image: 'food_26.png',
      isAvailable: true
    }, { headers: { token: adminToken } });
    assert(addDishRes.data.success === true, 'Admin successfully authorized to create menu item');

    // 5. Test RBAC on Staff & Admin POS Orders
    console.log('\n[5] Testing RBAC on POS Order Creation...');
    // Customer trying to call POS endpoint
    try {
      await axios.post(`${BASE_URL}/api/orders`, {
        items: [{ _id: '1', quantity: 2 }]
      }, { headers: { token: customerToken } });
      assert(false, 'Customer should NOT be allowed to call staff POS order endpoint');
    } catch (err) {
      assert(err.response?.status === 403, 'Customer blocked from staff POS with 403 Forbidden');
    }

    // Staff creating POS order
    const staffOrderRes = await axios.post(`${BASE_URL}/api/orders`, {
      orderType: 'Dine-in',
      tableNumber: 'T-04',
      customerName: 'Rahul Sharma',
      items: [{ _id: '1', quantity: 2 }],
      taxPercent: 5,
      discount: 20,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid'
    }, { headers: { token: staffToken } });

    assert(staffOrderRes.data.success === true, 'Staff authorized to create POS order');
    const orderData = staffOrderRes.data.data;
    assert(orderData.subtotal === 240, `Server correctly calculated subtotal: 240 (got ${orderData.subtotal})`);
    assert(orderData.tax === 12, `Server correctly calculated 5% tax: 12 (got ${orderData.tax})`);
    assert(orderData.discount === 20, `Server correctly applied discount: 20 (got ${orderData.discount})`);
    assert(orderData.amount === 232, `Server correctly validated final total: 232 (got ${orderData.amount})`);
    assert(orderData.paymentMethod === 'UPI', 'Payment method recorded as UPI');
    assert(orderData.paymentStatus === 'Paid', 'Payment status recorded as Paid');

    // 6. Test Rejection of Unavailable Menu Items
    console.log('\n[6] Testing Rejection of Unavailable Items...');
    // Make item 1 unavailable using Admin
    await axios.patch(`${BASE_URL}/api/menu/1/availability`, {}, { headers: { token: adminToken } });
    try {
      await axios.post(`${BASE_URL}/api/orders`, {
        items: [{ _id: '1', quantity: 1 }]
      }, { headers: { token: staffToken } });
      assert(false, 'Server should reject orders with unavailable items');
    } catch (err) {
      assert(err.response?.status === 400, 'Server rejected order containing unavailable item with 400 Bad Request');
    }
    // Restore item 1 availability
    await axios.patch(`${BASE_URL}/api/menu/1/availability`, {}, { headers: { token: adminToken } });

    // 7. Test Table Statuses API & Table Availability
    console.log('\n[7] Testing Dining Table Statuses & Inventory...');
    const tableRes = await axios.get(`${BASE_URL}/api/tables`);
    assert(tableRes.data.success === true, 'Table inventory retrieved');
    assert(Array.isArray(tableRes.data.data) && tableRes.data.data.length >= 8, 'All 8 restaurant tables present (T-01 to T-08)');
    
    // Find an available table
    const availableTableObj = tableRes.data.data.find(t => t.isAvailable);
    assert(Boolean(availableTableObj), `Found available table: ${availableTableObj?.tableNumber}`);
    const chosenTable = availableTableObj?.tableNumber || 'T-01';

    // 8. Test Customer Dine-in Order Placement
    console.log('\n[8] Testing Customer Dine-in Order Placement...');
    const custDineInRes = await axios.post(`${BASE_URL}/api/order/place`, {
      orderType: 'Dine-in',
      tableNumber: chosenTable,
      customerName: 'Anand Kumar',
      customerPhone: '9876501234',
      items: [{ _id: '2', quantity: 2 }], // Rolls: price 130 * 2 = 260
      paymentMethod: 'Cash'
    }, { headers: { token: customerToken } });

    assert(custDineInRes.data.success === true, `Customer Dine-in order placed for table ${chosenTable}`);
    const dineInOrder = custDineInRes.data.data;
    assert(dineInOrder.deliveryFee === 0, 'Dine-in delivery fee is strictly ₹0');
    assert(dineInOrder.subtotal === 360, `Dine-in subtotal is ₹360 (got ${dineInOrder.subtotal})`);
    assert(dineInOrder.amount === 360, `Dine-in total amount is ₹360 (got ${dineInOrder.amount})`);
    assert(dineInOrder.paymentStatus === 'Pending', 'Payment status is truthfully recorded as "Pending"');
    assert(dineInOrder.tableNumber === chosenTable, `Assigned table matches ${chosenTable}`);

    // 9. Test Double-Booking Prevention: Attempt to book the same table again
    console.log('\n[9] Testing Table Conflict / Double-Booking Prevention...');
    try {
      await axios.post(`${BASE_URL}/api/order/place`, {
        orderType: 'Dine-in',
        tableNumber: chosenTable, // already occupied!
        customerName: 'Conflicting Guest',
        customerPhone: '9123456780',
        items: [{ _id: '2', quantity: 1 }],
        paymentMethod: 'Cash'
      }, { headers: { token: customerToken } });
      assert(false, `Server should REJECT reservation for occupied table ${chosenTable}`);
    } catch (err) {
      assert(err.response?.status === 400, `Server correctly blocked double-booking on table ${chosenTable} with 400 Bad Request`);
    }

    // 10. Test Customer Takeaway Order Placement
    console.log('\n[10] Testing Customer Takeaway Order Placement...');
    const custTakeawayRes = await axios.post(`${BASE_URL}/api/order/place`, {
      orderType: 'Takeaway',
      customerName: 'Meera Nair',
      customerPhone: '9988776655',
      items: [{ _id: '3', quantity: 1 }], // Clover Salad: 160
      paymentMethod: 'UPI'
    }, { headers: { token: customerToken } });

    assert(custTakeawayRes.data.success === true, 'Customer Takeaway order placed');
    const takeawayOrder = custTakeawayRes.data.data;
    assert(takeawayOrder.deliveryFee === 0, 'Takeaway delivery fee is strictly ₹0');
    assert(takeawayOrder.amount === 160, `Takeaway total amount is ₹160 (got ${takeawayOrder.amount})`);
    assert(takeawayOrder.paymentMethod === 'UPI', 'Takeaway payment method recorded as UPI');
    assert(takeawayOrder.paymentStatus === 'Pending', 'Takeaway UPI payment is recorded as Pending verification');

    // 11. Test Customer Delivery Order Placement
    console.log('\n[11] Testing Customer Delivery Order Placement...');
    const custDeliveryRes = await axios.post(`${BASE_URL}/api/order/place`, {
      orderType: 'Delivery',
      address: {
        firstName: 'Vikram',
        lastName: 'Singh',
        email: 'vikram@example.com',
        street: '42 MG Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipcode: '560038',
        country: 'India',
        phone: '9876543210'
      },
      items: [{ _id: '5', quantity: 1 }], // Lasagna Rolls: 140
      paymentMethod: 'Cash'
    }, { headers: { token: customerToken } });

    assert(custDeliveryRes.data.success === true, 'Customer Delivery order placed');
    const deliveryOrder = custDeliveryRes.data.data;
    assert(deliveryOrder.deliveryFee === 50, 'Delivery fee is accurately applied as ₹50');
    assert(deliveryOrder.subtotal === 140, `Delivery subtotal is ₹140 (got ${deliveryOrder.subtotal})`);
    assert(deliveryOrder.amount === 190, `Delivery final total is ₹190 (140 + 50) (got ${deliveryOrder.amount})`);
    assert(deliveryOrder.address.street === '42 MG Road, Indiranagar', 'Delivery address persisted');

    // 12. Test Customer Orders Retrieval (My Orders)
    console.log('\n[12] Testing Customer Orders Retrieval (My Orders)...');
    const userOrdersRes = await axios.post(`${BASE_URL}/api/order/userorders`, {}, {
      headers: { token: customerToken }
    });
    assert(userOrdersRes.data.success === true, 'User orders retrieved successfully');
    assert(Array.isArray(userOrdersRes.data.data), 'User orders list is an array');
    const myOrderIds = userOrdersRes.data.data.map(o => o.orderNumber);
    assert(myOrderIds.includes(dineInOrder.orderNumber), `Customer orders contains Dine-in order ${dineInOrder.orderNumber}`);
    assert(myOrderIds.includes(takeawayOrder.orderNumber), `Customer orders contains Takeaway order ${takeawayOrder.orderNumber}`);

    // 13. Test Customer Orders in Staff Kitchen Display & Live Orders
    console.log('\n[13] Testing Customer Orders visible in Staff Kitchen Display...');
    const staffOrdersRes = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { token: staffToken }
    });
    assert(staffOrdersRes.data.success === true, 'Staff retrieved live orders');
    const staffOrderNumbers = staffOrdersRes.data.data.map(o => o.orderNumber);
    assert(staffOrderNumbers.includes(dineInOrder.orderNumber), `Staff sees customer Dine-in order ${dineInOrder.orderNumber}`);
    assert(staffOrderNumbers.includes(deliveryOrder.orderNumber), `Staff sees customer Delivery order ${deliveryOrder.orderNumber}`);

    // 14. Test Staff Updating Status and Table Release
    console.log('\n[14] Testing Status Update Workflow & Table Release...');
    const dineInId = dineInOrder._id || dineInOrder.orderNumber;
    
    // Progress: Pending -> Preparing -> Ready -> Completed
    await axios.patch(`${BASE_URL}/api/orders/${dineInId}/status`, { status: 'Preparing' }, { headers: { token: staffToken } });
    await axios.patch(`${BASE_URL}/api/orders/${dineInId}/status`, { status: 'Ready' }, { headers: { token: staffToken } });
    const completeRes = await axios.patch(`${BASE_URL}/api/orders/${dineInId}/status`, { status: 'Completed' }, { headers: { token: staffToken } });
    assert(completeRes.data.success === true, 'Staff completed Dine-in order');

    // Record Cash payment for this completed order
    const payRes = await axios.post(`${BASE_URL}/api/orders/${dineInId}/payment`, { paymentMethod: 'Cash' }, { headers: { token: staffToken } });
    assert(payRes.data.success === true, 'Staff recorded Cash payment for order');

    // Verify table is released!
    const tableAfterComplete = await axios.get(`${BASE_URL}/api/tables`);
    const releasedTable = tableAfterComplete.data.data.find(t => t.tableNumber === chosenTable);
    assert(releasedTable?.isAvailable === true, `Table ${chosenTable} successfully released and marked available after order completion!`);

    // 15. Test Daily Sales Summary & Revenue Calculation
    console.log('\n[15] Testing Daily Sales Report & Revenue Integrity...');
    const salesRes = await axios.get(`${BASE_URL}/api/reports/daily-sales`, {
      headers: { token: adminToken }
    });
    assert(salesRes.data.success === true, 'Daily sales report retrieved');
    assert(salesRes.data.data.dailySales > 0, `Total paid daily sales: ₹${salesRes.data.data.dailySales}`);
    assert(salesRes.data.data.completedOrders > 0, `Completed orders count: ${salesRes.data.data.completedOrders}`);
    assert(salesRes.data.data.paymentBreakdown !== undefined, 'Payment breakdown (Cash/UPI/Card) present');

    // 16. Test Razorpay Online UPI Checkout & Signature Verification
    console.log('\n[16] Testing Razorpay Online UPI Checkout & Signature Verification...');
    
    // Check if server process has Razorpay credentials configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      try {
        await axios.post(`${BASE_URL}/api/order/place`, {
          orderType: 'Takeaway',
          items: [{ _id: '1', quantity: 1 }],
          paymentMethod: 'UPI',
          customerName: 'UPI Test Customer',
          customerPhone: '9876500000'
        }, { headers: { token: customerToken } });
        assert(false, 'Should fail when Razorpay API credentials are unset');
      } catch (err) {
        assert(err.response?.status === 400 || err.response?.status === 500, 'Server safely rejected UPI order creation when Razorpay API keys are unconfigured without generating fake order IDs');
      }
    } else {
      const rzpOrderPlaceRes = await axios.post(`${BASE_URL}/api/order/place`, {
        orderType: 'Takeaway',
        items: [{ _id: '1', quantity: 1 }], // Greek Salad: 120
        paymentMethod: 'UPI',
        customerName: 'UPI Test Customer',
        customerPhone: '9876500000'
      }, { headers: { token: customerToken } });

      assert(rzpOrderPlaceRes.data.success === true, 'Razorpay UPI checkout initialized');
      assert(rzpOrderPlaceRes.data.requiresRazorpay === true, 'Response requires Razorpay online payment');
      assert(rzpOrderPlaceRes.data.razorpayOrderId !== undefined && !rzpOrderPlaceRes.data.razorpayOrderId.startsWith('order_rzp_'), 'Real Razorpay order ID returned from official Razorpay SDK (no fake order_rzp_ fallback)');
      assert(rzpOrderPlaceRes.data.amount === 12000, `Amount in paise calculated correctly as 12000 (got ${rzpOrderPlaceRes.data.amount})`);
    }

    // Test Razorpay Dedicated Webhook (/api/webhooks/razorpay) with payment.captured
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_webhook_secret';
    const payload1 = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_webhook_888',
            order_id: 'order_test_123'
          }
        }
      }
    };
    const crypto = await import('crypto');
    const sig1 = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload1)).digest('hex');

    const webhookRes = await axios.post(`${BASE_URL}/api/webhooks/razorpay`, payload1, {
      headers: { 'x-razorpay-signature': sig1 }
    });
    assert(webhookRes.data.status === 'ok', 'Dedicated Razorpay webhook /api/webhooks/razorpay processed payment.captured idempotently');

    // Test Razorpay Webhook with payment.failed
    const payload2 = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_failed_777',
            order_id: 'order_failed_test_123'
          }
        }
      }
    };
    const sig2 = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload2)).digest('hex');

    const webhookFailRes = await axios.post(`${BASE_URL}/api/webhooks/razorpay`, payload2, {
      headers: { 'x-razorpay-signature': sig2 }
    });
    assert(webhookFailRes.data.status === 'ok', 'Razorpay webhook handled payment.failed event safely');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
  } catch (err) {
    console.error('Test execution failed with error:', err.message, err.response?.data);
  }
}

runTests();
