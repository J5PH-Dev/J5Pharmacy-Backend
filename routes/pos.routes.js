const express = require('express');
const router = express.Router();
const posController = require('../controller/pos.controller');
const { verifyToken, isPharmacist } = require('../middleware/auth.middleware');

// Product Search Routes
router.get('/search', verifyToken, isPharmacist, posController.searchProducts);
router.get('/barcode/:barcode', verifyToken, isPharmacist, posController.searchByBarcode);

// Hold Transaction (F3)
router.post('/transactions/hold', verifyToken, isPharmacist, posController.holdTransaction);

// Get Held Transactions (F4)
router.get('/transactions/held/:salesSessionId', verifyToken, isPharmacist, posController.getHeldTransactions);

// Delete Held Transaction
router.delete('/transactions/held/:heldTransactionId', verifyToken, isPharmacist, posController.deleteHeldTransaction);

// Add this route after the delete route
router.get('/transactions/held/:heldTransactionId/items', verifyToken, isPharmacist, posController.getHeldTransactionItems);

// Prescription (F6)
router.post('/prescriptions', verifyToken, isPharmacist, posController.createPrescription);

// Process Return (F7)
router.get('/transactions/:id', verifyToken, isPharmacist, posController.getTransactionById);
router.post('/returns', verifyToken, isPharmacist, posController.processReturn);

// Complete Transaction
router.post('/transactions', verifyToken, isPharmacist, posController.completeTransaction);

// Sales Session Management
router.post('/sessions', verifyToken, isPharmacist, posController.createSalesSession);
router.patch('/sessions/:sessionId', verifyToken, isPharmacist, posController.closeSalesSession);

// Customer Management
router.get('/customers/by-card/:cardId', verifyToken, isPharmacist, posController.getCustomerByCard);
router.post('/customers', verifyToken, isPharmacist, posController.createCustomerWithCard);

// Add this route
router.get('/generate-invoice-number', verifyToken, isPharmacist, posController.generateInvoiceNumber);

// Stock Checking
router.get('/search/stock/:branchId/:productId', posController.getProductStock);

module.exports = router; 