const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller');
const { verifyToken, isPharmacist } = require('../middleware/auth.middleware');

// Debug middleware
const debugMiddleware = (req, res, next) => {
    console.log('Request headers:', req.headers);
    console.log('Auth token:', req.headers.authorization);
    next();
};

// Apply middleware to protect routes
router.use(debugMiddleware);
router.use(verifyToken);
router.use(isPharmacist);

// Sales Session Management
router.post('api/pos/sessions/start', posController.startSalesSession);
router.post('api/pos/sessions/end', posController.endSalesSession);
router.get('/pos/sessions/current/:branchId', posController.getCurrentSession);

// Transaction Management
router.post('api/pos/transactions', posController.createTransaction);
router.get('api/pos/transactions/:invoiceNumber', posController.getTransaction);
router.post('api/pos/transactions/hold', posController.holdTransaction);
router.get('api/pos/transactions/held', posController.getHeldTransactions);
router.delete('api/pos/transactions/held/:id', posController.deleteHeldTransaction);
router.post('api/pos/transactions/recall/:id', posController.recallHeldTransaction);

// Product Search and Inventory
router.get('/pos/products/search/:branchId', posController.searchProducts);
router.get('api/pos/products/barcode/:barcode', posController.getProductByBarcode);
router.post('api/pos/products/stock/update', posController.updateStock);

// Customer Management
router.get('api/pos/customers/search', posController.searchCustomers);
router.get('api/pos/customers/:id/points', posController.getCustomerPoints);
router.post('api/pos/customers/points/update', posController.updateCustomerPoints);

// Returns and Refunds
router.post('api/pos/returns', posController.processReturn);
router.get('api/pos/returns/:id', posController.getReturn);

module.exports = router;
