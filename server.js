import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './backend/config/db.js';
import foodRouter from './backend/routes/foodRoute.js';
import userRouter from './backend/routes/userRoute.js';
import cartRouter from './backend/routes/cartRoute.js';
import orderRouter from './backend/routes/orderRoute.js';

import { handleRazorpayWebhook } from './backend/controllers/orderController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure backend uploads directory exists
const uploadsDir = path.join(__dirname, 'backend', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware with rawBody capture for exact HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cors());
app.use('/images', express.static(uploadsDir));

// Health check endpoints for Cloud Run probes
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Dedicated Razorpay Webhook Route
app.post('/api/webhooks/razorpay', handleRazorpayWebhook);

// API routes
app.use('/api/food', foodRouter);
app.use('/api/menu', foodRouter);
app.use('/api/user', userRouter);
app.use('/api/auth', userRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/orders', orderRouter);
app.use('/api/tables', (req, res, next) => {
  req.url = '/tables';
  orderRouter(req, res, next);
});
app.get('/api/reports/daily-sales', (req, res, next) => {
  req.url = '/reports/daily-sales';
  orderRouter(req, res, next);
});

// Database connection (non-blocking fallback to in-memory store)
connectDB().catch((err) => {
  console.warn('[AI Studio] Database warning:', err.message);
});

// App routing and static/Vite serving
const adminDist = path.join(__dirname, 'admin', 'dist');
const frontendDist = path.join(__dirname, 'frontend', 'dist');
const hasDist = fs.existsSync(adminDist) && fs.existsSync(frontendDist);

if (!hasDist) {
  console.log('[AI Studio] Static dist folders not found. Mounting Vite middlewares dynamically...');
  // Vite middleware for admin panel
  const adminVite = await createViteServer({
    root: path.resolve(__dirname, 'admin'),
    base: '/admin/',
    server: { middlewareMode: true, host: '0.0.0.0', hmr: false, ws: false },
    appType: 'spa',
  });

  // Route /admin requests through adminVite
  app.use(async (req, res, next) => {
    if (req.url === '/admin') {
      return res.redirect('/admin/');
    }
    if (req.url.startsWith('/admin')) {
      adminVite.middlewares(req, res, async () => {
        if (req.method === 'GET' && !req.url.includes('.')) {
          try {
            const template = fs.readFileSync(path.resolve(__dirname, 'admin/index.html'), 'utf-8');
            const html = await adminVite.transformIndexHtml(req.url, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          } catch (e) {
            adminVite.ssrFixStacktrace(e);
            return next(e);
          }
        }
        next();
      });
      return;
    }
    next();
  });

  // Vite middleware for frontend client
  const frontendVite = await createViteServer({
    root: path.resolve(__dirname, 'frontend'),
    base: '/',
    server: { middlewareMode: true, host: '0.0.0.0', hmr: false, ws: false },
    appType: 'spa',
  });

  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/admin') || req.url.startsWith('/__aistudio') || req.url.startsWith('/images')) {
      return next();
    }
    frontendVite.middlewares(req, res, next);
  });
} else {
  console.log('[AI Studio] Serving production static dist files...');
  app.use('/admin', express.static(adminDist));
  app.get(['/admin', '/admin/*'], (req, res) => {
    res.sendFile(path.join(adminDist, 'index.html'));
  });

  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/admin') || req.url.startsWith('/__aistudio') || req.url.startsWith('/images')) {
      return res.status(404).json({ message: 'Route not found' });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Food Del server running at http://0.0.0.0:${port}`);
});
