const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
require('dotenv').config();
const { testConnection } = require('./config/database');
const InventoryRoutes = require('./routes/InventoryRoutes');
const authRoutes = require('./routes/auth.routes');
const cashReconciliationRoutes = require('./routes/cashReconciliation.routes');
const transactionRoutes = require('./routes/transaction.routes');
const branchRoutes = require('./routes/branchRoutes');
const customerRoutes = require('./routes/customer.routes');
const staffRoutes = require('./routes/staff.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const resourcesRoutes = require('./routes/resources.routes');
const posRoutes = require('./routes/pos.routes');
// const posProductRoutes = require('./routes/pos/pos.product.routes');
// const posTransactionRoutes = require('./routes/pos/pos.transaction.routes');
// const posSessionRoutes = require('./routes/pos/pos.session.routes');

// const posInventoryRoutes = require('./routes/pos/pos.inventory.routes');
// const posCustomerRoutes = require('./routes/pos/pos.customer.routes');
const { initializeSocket } = require('./socket');
// Import dev routes
const devRoutes = require('./routes/dev.routes');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to J5 Pharmacy Management System API' });
});

// Test database connection
testConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/', InventoryRoutes);
app.use('/api/cash-reconciliation', cashReconciliationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', branchRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/pos', posRoutes);
// app.use('/api/pos/products', posProductRoutes);
// app.use('/api/pos/transactions', posTransactionRoutes);
// app.use('/api/pos/sessions', posSessionRoutes);
// app.use('/api/pos/inventory', posInventoryRoutes);

// app.use('/api/pos/customers', posCustomerRoutes);

// Register dev routes
if (process.env.NODE_ENV === 'development') {
    app.use('/api/dev', devRoutes);
    console.log('[DEV] Development routes enabled');
}

// Initialize Socket.io
initializeSocket(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

