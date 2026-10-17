# 🍽️ Restaurant POS & Order Management System

A full-stack, production-ready Point of Sale (POS) and Order Management System designed for restaurants, cafés, and quick-service establishments. It empowers restaurant staff to manage menu items, create dine-in and takeaway orders, calculate bills with tax and discounts, transition order statuses through the kitchen pipeline, record payments, and analyze daily sales summaries.

---

## 📌 Table of Contents
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Architecture & Access Control (RBAC)](#-architecture--access-control-rbac)
- [API Documentation](#-api-documentation)
- [Business Rules & Validation](#-business-rules--validation)
- [Demo Credentials](#-demo-credentials)
- [Installation & Getting Started](#-installation--getting-started)

---

## 💻 Tech Stack

- **Frontend**: React (Vite SPA architecture, responsive Tailwind styling, modular hooks, multi-role portal for Customers, Staff, and Admins).
- **Backend**: Node.js & Express.js (REST API, secure middleware, HMAC validation).
- **Database**: MongoDB (Mongoose schemas) with seamless automated in-memory store fallback for offline/demo development without external dependencies.
- **Authentication**: JWT (JSON Web Token) with salted `bcryptjs` password hashing and role-based permissions (`admin`, `staff`, `customer`).

---

## 🚀 Key Features

### 1. Menu Management
- **Full Item Lifecycle**: Create, view, edit, toggle availability (In Stock / Out of Stock), and remove menu items.
- **Attributes**: Item name, category (Salad, Rolls, Deserts, Sandwich, Cake, Pure Veg, Pasta, Noodles), price, description, image, and active availability status.
- **Search & Filtering**: Real-time keyword search and category filtering on both backend and frontend interfaces.
- **Access Level**: Restricted strictly to **Admin** users.

### 2. POS Order Creation
- **Multi-Type Orders**:
  - **Dine-in**: Seamless dining table allocation (`T-01` through `T-08`) with instant collision detection and automatic occupancy locking.
  - **Takeaway**: Fast counter order creation for pickup with zero delivery surcharge.
  - **Delivery**: Online customer orders with full shipping address validation and standard delivery fee calculation.
- **Item Cart Management**: Add multiple menu items, adjust quantities, remove items, and view real-time subtotal updates.
- **Unique Order Identifiers**: Auto-generated sequential order numbers (e.g., `TOM-1001`, `TOM-1002`).

### 3. Kitchen Workflow & Status Lifecycle
Track and update orders through standard restaurant operations:
$$\text{Pending} \longrightarrow \text{Preparing} \longrightarrow \text{Ready} \longrightarrow \text{Completed}$$
- Orders can also be marked as `Cancelled` if necessary.
- Completing a Dine-in order automatically releases its dining table back to available inventory.
- Real-time order monitoring available on both Staff POS Dashboard and Admin Orders View.

### 4. Authoritative Billing & Calculations
- **Dynamic Breakdown**: Subtotal, configurable tax % (default 5%), optional staff discount, and final payable total.
- **Server-Side Validation**: All item prices and line-item totals are strictly computed on the backend from authoritative database records. Client-manipulated prices or totals are rejected.
- **Printable Invoices**: Built-in formatted receipt modal for thermal POS bill printing (`window.print()`).

### 5. Payment Recording
- **Payment Methods**: Staff can record payments via **Cash**, **UPI**, or **Card**.
- **Payment Status**: Tracked independently (`Paid` vs `Pending`).
- **Webhook & Gateway Integration**: Dedicated support for server-side HMAC-verified Razorpay online payments and webhooks.

### 6. Sales Dashboard & Summary Reports
- **Key Metrics**:
  - Total Revenue / Daily Sales (paid orders only)
  - Total Orders & Completed Orders
  - Active Orders Breakdown (`Pending`, `Preparing`, `Ready`)
  - Payment Method Breakdown (`Cash`, `UPI`, `Card`)
  - Chronological Recent Orders Log
- Available at `/admin/reports` and via `GET /api/reports/daily-sales`.

---

## 🔒 Architecture & Access Control (RBAC)

The application enforces a 3-tier Role-Based Access Control model:

| Role | Menu Management | POS Order Creation | Kitchen Status Updates | Payment Recording | View Sales Reports |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ Full CRUD | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Staff** | ❌ (403 Forbidden) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Customer** | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ❌ (403 Forbidden) |

*Public self-registration via `/api/auth/register` strictly creates `customer` accounts, completely preventing privilege escalation.*

---

## 📡 API Documentation

### Authentication & Users
- `POST /api/auth/login` — Authenticate user (Admin, Staff, or Customer) and return JWT token.
- `POST /api/auth/register` — Register a customer account (always assigned `customer` role).

### Menu Management
- `GET /api/menu` — Fetch menu items (Supports query filters: `?category=Pasta&search=alfredo&availableOnly=true`).
- `POST /api/menu` — *(Admin Only)* Add a new menu item with optional image upload.
- `PUT /api/menu/:id` — *(Admin Only)* Edit existing menu item details.
- `PATCH /api/menu/:id/availability` — *(Admin Only)* Toggle item availability status (In Stock / Out of Stock).
- `DELETE /api/menu/:id` — *(Admin Only)* Remove a menu item.

### Order Management
- `POST /api/orders` — *(Staff / Admin)* Create POS Dine-in or Takeaway order with server calculation.
- `GET /api/orders` — *(Staff / Admin)* Retrieve list of orders with status and search filters.
- `GET /api/orders/:id` — Retrieve details for a single order by ID or order number.
- `PATCH /api/orders/:id/status` — *(Staff / Admin)* Update order workflow status (`Pending`, `Preparing`, `Ready`, `Completed`, `Cancelled`).
- `POST /api/orders/:id/payment` — *(Staff / Admin)* Record payment method (`Cash`, `UPI`, `Card`) and mark as `Paid`.
- `GET /api/tables` — Retrieve real-time dining table occupancy and availability (`T-01` to `T-08`).

### Reports
- `GET /api/reports/daily-sales` — *(Staff / Admin)* Aggregate daily sales, revenue, order counts, and payment breakdowns.

---

## 🛡️ Business Rules & Validation

1. **Authoritative Server Pricing**: The client never determines order prices. The server fetches current prices directly from the menu database and computes line items, tax, and final totals.
2. **Availability Enforcement**: If an item has `isAvailable: false`, any attempt to place an order containing that item is rejected with `400 Bad Request`.
3. **Table Conflict Prevention**: A Dine-in order cannot be assigned to a table currently occupied by an active order (`Pending`, `Preparing`, or `Ready`).
4. **Independent Status Tracking**: Kitchen fulfilment (`Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed`) is separated from payment status (`Pending` ➔ `Paid`).

---

## 🔑 Demo Credentials

The application includes seeded demo accounts ready for immediate testing:

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin Panel** (`/admin`) | `admin@restaurant.com` | `admin123` | `admin` |
| **Staff POS** (`/admin/staff-login` or `/pos`) | `staff@restaurant.com` | `staff123` | `staff` |
| **Customer Website** (`/`) | `customer@example.com` | `customer123` | `customer` |

---

## ⚙️ Installation & Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or bun

### 2. Clone and Install
```bash
git clone https://github.com/Akhilesh1118/Food-Delivery-Webapplication.git
cd Food-Delivery-Webapplication
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(MongoDB URI is optional: if left blank, the built-in in-memory store activates automatically with full persistence during the server session).*

### 4. Run Development Server
```bash
npm run dev
```
- Open `http://localhost:3000/` for the Customer Food Ordering experience.
- Open `http://localhost:3000/pos` for the Staff POS Terminal.
- Open `http://localhost:3000/admin` for the Admin Management Portal.

### 5. Production Build
```bash
npm run build
npm start
```

---



---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
