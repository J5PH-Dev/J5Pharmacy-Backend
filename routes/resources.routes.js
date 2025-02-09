const express = require('express');
const router = express.Router();
const resourcesController = require('../controller/resources.controller');
const { verifyToken, isPMSUser } = require('../middleware/auth.middleware');

// Apply middleware to all routes
router.use(verifyToken, isPMSUser);

// Supplier Management Routes
router.get('/suppliers', resourcesController.getAllSuppliers);
router.post('/suppliers', resourcesController.addSupplier);
router.put('/suppliers/:supplier_id', resourcesController.updateSupplier);
router.delete('/suppliers/:supplier_id', resourcesController.deleteSupplier);

// Archive Management Routes
router.get('/archived-suppliers', resourcesController.getArchivedSuppliers);
router.post('/archive-supplier/:supplier_id', resourcesController.archiveSupplier);
router.post('/restore-supplier/:archive_id', resourcesController.restoreSupplier);
router.post('/bulk-archive-suppliers', resourcesController.bulkArchiveSuppliers);

// Product Supplier Management Routes
router.get('/products/:product_id/suppliers', resourcesController.getProductSuppliers);
router.post('/products/:product_id/suppliers', resourcesController.addProductSupplier);
router.put('/product-suppliers/:product_supplier_id', resourcesController.updateProductSupplier);
router.delete('/product-suppliers/:product_supplier_id', resourcesController.removeProductSupplier);

// Price Management Routes
router.get('/products/:product_id/price-history', resourcesController.getProductPriceHistory);
router.post('/products/:product_id/calculate-price', resourcesController.calculateProductPrice);

// Bulk Import Routes
router.post('/bulk-import/validate', resourcesController.validateBulkImport);
router.get('/bulk-import/search-product', resourcesController.searchProduct);
router.post('/bulk-import/process', verifyToken, resourcesController.processBulkImport);

// Add categories route
router.get('/categories', resourcesController.getCategories);

module.exports = router; 