const db = require('../config/database');
const { getMySQLTimestamp } = require('../utils/timeZoneUtil');

// Supplier Management
const getAllSuppliers = async (req, res) => {
    try {
        const [suppliers] = await db.pool.query(
            `SELECT * FROM suppliers WHERE is_active = 1 ORDER BY supplier_name`
        );
        console.log('Fetched all suppliers');
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Error fetching suppliers' });
    }
};

const addSupplier = async (req, res) => {
    const { supplier_name, contact_person, email, phone, address } = req.body;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        // Insert new supplier
        const [result] = await connection.query(
            `INSERT INTO suppliers 
             (supplier_name, contact_person, email, phone, address, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
            [supplier_name, contact_person, email, phone, address]
        );

        await connection.commit();
        console.log('Added new supplier:', {
            supplier_id: result.insertId,
            supplier_name,
            contact_person,
            email,
            phone,
            address
        });
        res.json({ 
            message: 'Supplier added successfully',
            supplier_id: result.insertId 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding supplier:', error);
        res.status(500).json({ message: 'Error adding supplier' });
    } finally {
        connection.release();
    }
};

const updateSupplier = async (req, res) => {
    const { supplier_id } = req.params;
    const { supplier_name, contact_person, email, phone, address } = req.body;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE suppliers 
             SET supplier_name = ?, 
                 contact_person = ?, 
                 email = ?, 
                 phone = ?, 
                 address = ?,
                 updated_at = ${getMySQLTimestamp()}
             WHERE supplier_id = ?`,
            [supplier_name, contact_person, email, phone, address, supplier_id]
        );

        await connection.commit();
        console.log('Updated supplier:', {
            supplier_id,
            supplier_name,
            contact_person,
            email,
            phone,
            address
        });
        res.json({ message: 'Supplier updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Error updating supplier' });
    } finally {
        connection.release();
    }
};

const deleteSupplier = async (req, res) => {
    const { supplier_id } = req.params;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        // Soft delete by setting is_active to 0
        await connection.query(
            `UPDATE suppliers 
             SET is_active = 0,
                 updated_at = ${getMySQLTimestamp()}
             WHERE supplier_id = ?`,
            [supplier_id]
        );

        await connection.commit();
        console.log('Deleted supplier:', { supplier_id });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Error deleting supplier' });
    } finally {
        connection.release();
    }
};

// Get suppliers for a specific product
const getProductSuppliers = async (req, res) => {
    const { product_id } = req.params;
    try {
        const [suppliers] = await db.pool.query(
            `SELECT ps.*, s.supplier_name, s.contact_person, s.email, s.phone, 
                    p.name as product_name, p.brand_name
             FROM product_suppliers ps
             JOIN suppliers s ON ps.supplier_id = s.supplier_id
             JOIN products p ON ps.product_id = p.id
             WHERE ps.product_id = ? AND ps.is_active = 1 AND p.is_active = 1
             ORDER BY ps.is_preferred DESC, s.supplier_name`,
            [product_id]
        );
        console.log('Fetched suppliers for product:', product_id);
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching product suppliers:', error);
        res.status(500).json({ message: 'Error fetching product suppliers' });
    }
};

// Add supplier to a product
const addProductSupplier = async (req, res) => {
    const { product_id } = req.params;
    const { supplier_id, supplier_price, ceiling_price, is_preferred } = req.body;
    const connection = await db.pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // If this supplier is set as preferred, unset any existing preferred supplier
        if (is_preferred) {
            await connection.query(
                `UPDATE product_suppliers 
                 SET is_preferred = 0, 
                     updated_at = ${getMySQLTimestamp()}
                 WHERE product_id = ?`,
                [product_id]
            );
        }

        // Add new product supplier
        const [result] = await connection.query(
            `INSERT INTO product_suppliers 
             (product_id, supplier_id, supplier_price, ceiling_price, is_preferred, last_supply_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ${getMySQLTimestamp()}, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
            [product_id, supplier_id, supplier_price, ceiling_price, is_preferred]
        );

        // If this is the preferred supplier, update the product's current supplier
        if (is_preferred) {
            await connection.query(
                `UPDATE products 
                 SET current_supplier_id = ?, 
                     updatedAt = ${getMySQLTimestamp()}
                 WHERE id = ?`,
                [supplier_id, product_id]
            );
        }

        // Add to price history
        await connection.query(
            `INSERT INTO price_history 
             (product_id, product_supplier_id, supplier_price, ceiling_price, unit_price, markup_percentage, effective_date, created_at)
             SELECT ?, ?, ?, ?, p.price, p.markup_percentage, ${getMySQLTimestamp()}, ${getMySQLTimestamp()}
             FROM products p WHERE p.id = ?`,
            [product_id, result.insertId, supplier_price, ceiling_price, product_id]
        );

        await connection.commit();
        console.log('Added supplier to product:', product_id);
        res.json({ 
            id: result.insertId, 
            message: 'Product supplier added successfully' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding product supplier:', error);
        res.status(500).json({ message: 'Error adding product supplier' });
    } finally {
        connection.release();
    }
};

// Update product supplier
const updateProductSupplier = async (req, res) => {
    const { product_supplier_id } = req.params;
    const { supplier_price, ceiling_price, is_preferred } = req.body;
    const connection = await db.pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Get product_id and supplier_id
        const [supplierInfo] = await connection.query(
            'SELECT product_id, supplier_id FROM product_suppliers WHERE product_supplier_id = ?',
            [product_supplier_id]
        );

        if (supplierInfo.length === 0) {
            throw new Error('Product supplier not found');
        }

        // If setting as preferred, unset any existing preferred supplier
        if (is_preferred) {
            await connection.query(
                `UPDATE product_suppliers 
                 SET is_preferred = 0,
                     updated_at = ${getMySQLTimestamp()}
                 WHERE product_id = ?`,
                [supplierInfo[0].product_id]
            );
        }

        // Update product supplier
        await connection.query(
            `UPDATE product_suppliers 
             SET supplier_price = ?, 
                 ceiling_price = ?,
                 is_preferred = ?,
                 last_supply_date = ${getMySQLTimestamp()},
                 updated_at = ${getMySQLTimestamp()}
             WHERE product_supplier_id = ?`,
            [supplier_price, ceiling_price, is_preferred, product_supplier_id]
        );

        // If this is the preferred supplier, update the product's current supplier
        if (is_preferred) {
            await connection.query(
                `UPDATE products 
                 SET current_supplier_id = ?,
                     updatedAt = ${getMySQLTimestamp()}
                 WHERE id = ?`,
                [supplierInfo[0].supplier_id, supplierInfo[0].product_id]
            );
        }

        // Add to price history
        await connection.query(
            `INSERT INTO price_history 
             (product_id, product_supplier_id, supplier_price, ceiling_price, unit_price, markup_percentage, effective_date, created_at)
             SELECT p.id, ?, ?, ?, p.price, p.markup_percentage, ${getMySQLTimestamp()}, ${getMySQLTimestamp()}
             FROM products p 
             WHERE p.id = ?`,
            [product_supplier_id, supplier_price, ceiling_price, supplierInfo[0].product_id]
        );

        await connection.commit();
        console.log('Updated product supplier:', product_supplier_id);
        res.json({ message: 'Product supplier updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating product supplier:', error);
        res.status(500).json({ message: 'Error updating product supplier' });
    } finally {
        connection.release();
    }
};

// Remove supplier from product
const removeProductSupplier = async (req, res) => {
    const { product_supplier_id } = req.params;
    const connection = await db.pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Get product info before removal
        const [supplierInfo] = await connection.query(
            'SELECT product_id, supplier_id, is_preferred FROM product_suppliers WHERE product_supplier_id = ?',
            [product_supplier_id]
        );

        if (supplierInfo.length === 0) {
            throw new Error('Product supplier not found');
        }

        // Soft delete the product supplier
        await connection.query(
            `UPDATE product_suppliers 
             SET is_active = 0,
                 updated_at = ${getMySQLTimestamp()}
             WHERE product_supplier_id = ?`,
            [product_supplier_id]
        );

        // If this was the preferred supplier, update the product's current supplier
        if (supplierInfo[0].is_preferred) {
            // Find the next available supplier
            const [nextSupplier] = await connection.query(
                `SELECT supplier_id FROM product_suppliers 
                 WHERE product_id = ? AND is_active = 1 
                 ORDER BY supplier_price ASC LIMIT 1`,
                [supplierInfo[0].product_id]
            );

            await connection.query(
                `UPDATE products 
                 SET current_supplier_id = ?,
                     updatedAt = ${getMySQLTimestamp()}
                 WHERE id = ?`,
                [nextSupplier.length > 0 ? nextSupplier[0].supplier_id : null, supplierInfo[0].product_id]
            );
        }

        await connection.commit();
        console.log('Removed supplier from product:', product_supplier_id);
        res.json({ message: 'Product supplier removed successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error removing product supplier:', error);
        res.status(500).json({ message: 'Error removing product supplier' });
    } finally {
        connection.release();
    }
};

// Get price history for a product (including all suppliers)
const getProductPriceHistory = async (req, res) => {
    const { product_id } = req.params;
    try {
        const [history] = await db.pool.query(
            `SELECT ph.*, ps.supplier_id, s.supplier_name, 
                    p.name as product_name, p.brand_name
             FROM price_history ph
             JOIN product_suppliers ps ON ph.product_supplier_id = ps.product_supplier_id
             JOIN suppliers s ON ps.supplier_id = s.supplier_id
             JOIN products p ON ph.product_id = p.id
             WHERE ph.product_id = ? AND p.is_active = 1
             ORDER BY ph.effective_date DESC`,
            [product_id]
        );
        console.log('Fetched price history for product:', product_id);
        res.json(history);
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ message: 'Error fetching price history' });
    }
};

// Calculate and update product price based on supplier prices
const calculateProductPrice = async (req, res) => {
    const { product_id } = req.params;
    const { markup_percentage } = req.body;
    const connection = await db.pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Get current supplier's price and ceiling price
        const [supplierInfo] = await connection.query(
            `SELECT ps.supplier_price, ps.ceiling_price, 
                    p.name as product_name, p.brand_name
             FROM product_suppliers ps
             JOIN products p ON ps.product_id = p.id
             WHERE p.id = ? AND ps.is_active = 1 AND p.is_active = 1
             AND ps.supplier_id = p.current_supplier_id`,
            [product_id]
        );

        if (supplierInfo.length === 0) {
            throw new Error('No active supplier found for product');
        }

        const supplier_price = supplierInfo[0].supplier_price;
        const ceiling_price = supplierInfo[0].ceiling_price;

        // Calculate new unit price
        let unit_price = supplier_price * (1 + markup_percentage / 100);
        
        // Check against ceiling price if it exists
        if (ceiling_price && unit_price > ceiling_price) {
            unit_price = ceiling_price;
        }

        // Update product price
        await connection.query(
            `UPDATE products 
             SET price = ?,
                 markup_percentage = ?,
                 updatedAt = ${getMySQLTimestamp()}
             WHERE id = ?`,
            [unit_price, markup_percentage, product_id]
        );

        await connection.commit();
        console.log('Updated product price calculation for:', supplierInfo[0].product_name);
        res.json({ 
            unit_price,
            markup_percentage,
            message: 'Product price updated successfully' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error calculating product price:', error);
        res.status(500).json({ message: 'Error calculating product price' });
    } finally {
        connection.release();
    }
};

// Add getCategories function
const getCategories = async (req, res) => {
    const connection = await db.pool.getConnection();
    
    try {
        const [categories] = await connection.query(
            `SELECT 
                category_id,
                name,
                prefix
             FROM category 
             WHERE is_active = 1 
             ORDER BY name ASC`
        );

        console.log('Fetched categories:', categories.length);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    } finally {
        connection.release();
    }
};

// Update validateBulkImport function to check for duplicate barcodes
const validateBulkImport = async (req, res) => {
    const { products, importType, branchId } = req.body;
    console.log(`[BulkImport] Starting validation for ${products.length} products. Import type: ${importType}`);
    
    const validatedProducts = [];
    const connection = await db.pool.getConnection();
    const barcodeMap = new Map(); // Track duplicate barcodes

    try {
        // First pass: Check for duplicate barcodes in the import file
        console.log('[BulkImport] Checking for duplicate barcodes...');
        for (const product of products) {
            if (product.barcode) {
                if (barcodeMap.has(product.barcode)) {
                    console.log(`[BulkImport] Found duplicate barcode: ${product.barcode}`);
                    product.status = 'invalid';
                    product.errors = ['Duplicate barcode in import file'];
                    const duplicateIndex = barcodeMap.get(product.barcode);
                    validatedProducts[duplicateIndex].status = 'invalid';
                    validatedProducts[duplicateIndex].errors = ['Duplicate barcode in import file'];
                }
                barcodeMap.set(product.barcode, validatedProducts.length);
            }
        }

        // Second pass: Validate each product
        console.log('[BulkImport] Starting product validation...');
        for (const product of products) {
            console.log(`[BulkImport] Validating product: ${product.name} (${product.barcode})`);
            
            let matchedProduct = null;
            let similarProducts = [];
            let status = product.status || 'pending';
            let errors = product.errors || [];
            let currentStock = 0;

            if (status !== 'invalid') {
                // First, try to find by barcode
                if (product.barcode) {
                    console.log(`[BulkImport] Searching for barcode match: ${product.barcode}`);
                    const [barcodeMatch] = await connection.query(
                        `SELECT p.*, c.name as category_name,
                                bi.stock as current_stock
                         FROM products p
                         LEFT JOIN category c ON p.category = c.category_id
                         LEFT JOIN branch_inventory bi ON p.id = bi.product_id 
                            AND bi.branch_id = ? AND bi.is_active = 1
                         WHERE p.barcode = ? AND p.is_active = 1`,
                        [branchId, product.barcode]
                    );
                    if (barcodeMatch.length > 0) {
                        console.log(`[BulkImport] Found exact barcode match for: ${product.barcode}`);
                        matchedProduct = barcodeMatch[0];
                        currentStock = matchedProduct.current_stock || 0;
                        status = 'matched';
                    } else {
                        console.log(`[BulkImport] No barcode match found for: ${product.barcode}`);
                    }
                }

                // If no barcode match and importType allows new products, search by name
                if (!matchedProduct && product.name) {
                    console.log(`[BulkImport] Searching for similar products by name: ${product.name}`);
                    const searchTerm = `%${product.name}%`;
                    const [nameMatches] = await connection.query(
                        `SELECT p.*, c.name as category_name,
                                bi.stock as current_stock
                         FROM products p
                         LEFT JOIN category c ON p.category = c.category_id
                         LEFT JOIN branch_inventory bi ON p.id = bi.product_id 
                            AND bi.branch_id = ? AND bi.is_active = 1
                         WHERE (p.name LIKE ? OR p.brand_name LIKE ?) 
                         AND p.is_active = 1
                         LIMIT 5`,
                        [branchId, searchTerm, searchTerm]
                    );
                    if (nameMatches.length > 0) {
                        console.log(`[BulkImport] Found ${nameMatches.length} similar products for: ${product.name}`);
                        similarProducts = nameMatches;
                        status = 'similar';
                    } else if (importType === 'all') {
                        console.log(`[BulkImport] No matches found, marking as new product: ${product.name}`);
                        status = 'new';
                    } else {
                        console.log(`[BulkImport] No matches found, marking as invalid: ${product.name}`);
                        status = 'invalid';
                        errors.push('Product not found in database');
                    }
                }
            }

            validatedProducts.push({
                ...product,
                status,
                errors,
                matchedProduct,
                similarProducts,
                currentStock,
                importedData: {
                    name: product.name,
                    brand_name: product.brand_name
                }
            });
        }

        const statusCounts = validatedProducts.reduce((acc, product) => {
            acc[product.status] = (acc[product.status] || 0) + 1;
            return acc;
        }, {});

        console.log('[BulkImport] Validation complete. Results:', statusCounts);
        res.json(validatedProducts);
    } catch (error) {
        console.error('[BulkImport] Error validating bulk import:', error);
        res.status(500).json({ message: 'Error validating bulk import' });
    } finally {
        connection.release();
    }
};

const searchProduct = async (req, res) => {
    const { query, page = 0, limit = 5 } = req.query;
    try {
        // Get total count
        const [countResult] = await db.pool.query(
            `SELECT COUNT(*) as total
                FROM products p
                LEFT JOIN category c ON p.category = c.category_id
             WHERE (p.name LIKE ? OR p.brand_name LIKE ? OR p.barcode LIKE ?)
             AND p.is_active = 1`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );

        // Get paginated results
        const [products] = await db.pool.query(
            `SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN category c ON p.category = c.category_id
             WHERE (p.name LIKE ? OR p.brand_name LIKE ? OR p.barcode LIKE ?)
             AND p.is_active = 1
             ORDER BY p.name
             LIMIT ? OFFSET ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit), parseInt(page) * parseInt(limit)]
        );
        
        res.json({
            products,
            total: countResult[0].total
        });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Error searching products' });
    }
};

const processBulkImport = async (req, res) => {
    const { products, branch_id } = req.body;
    const connection = await db.pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const userId = req.user.userId;
        console.log('Processing bulk import by user:', userId);

        for (const product of products) {
            if (product.status === 'matched') {
                // Check if branch inventory exists
                const [existingInventory] = await connection.query(
                    `SELECT inventory_id, stock 
                     FROM branch_inventory 
                     WHERE product_id = ? AND branch_id = ? AND is_active = 1`,
                    [product.product_id, branch_id]
                );

                if (existingInventory.length > 0) {
                    console.log('Updating existing inventory:', {
                        inventory_id: existingInventory[0].inventory_id,
                        product_id: product.product_id,
                        old_stock: existingInventory[0].stock,
                        new_stock: product.quantity,
                        updated_by: userId
                    });

                    await connection.query(
                        `UPDATE branch_inventory 
                         SET stock = ?,
                             expiryDate = ?,
                             updatedAt = ${getMySQLTimestamp()}
                         WHERE inventory_id = ?`,
                        [product.quantity, product.expiry, existingInventory[0].inventory_id]
                    );

                    // Add inventory history record
                await connection.query(
                        `INSERT INTO inventory_history 
                         (inventory_id, transaction_type, quantity, previous_stock, 
                          current_stock, expiry_date, remarks, created_at, created_by)
                         VALUES (?, 'BULK_IMPORT', ?, ?, ?, ?, ?, ${getMySQLTimestamp()}, ?)`,
                        [
                            existingInventory[0].inventory_id,
                            product.quantity,
                            existingInventory[0].stock,
                            product.quantity,
                            product.expiry,
                            'Bulk import update - Stock set to imported value',
                            userId
                        ]
                    );
                } else {
                    // Create new branch inventory record
                    const [result] = await connection.query(
                    `INSERT INTO branch_inventory 
                     (branch_id, product_id, stock, expiryDate, is_active, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, 1, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
                        [branch_id, product.product_id, product.quantity, product.expiry]
                    );

                    // Add inventory history record
                    await connection.query(
                        `INSERT INTO inventory_history 
                         (inventory_id, transaction_type, quantity, previous_stock, 
                          current_stock, expiry_date, remarks, created_at, created_by)
                         VALUES (?, 'BULK_IMPORT', ?, 0, ?, ?, ?, ${getMySQLTimestamp()}, ?)`,
                        [
                            result.insertId,
                            product.quantity,
                            product.quantity,
                            product.expiry,
                            'New inventory from bulk import',
                            userId
                        ]
                    );
                }
            } else if (product.status === 'new') {
                // Handle new product creation
                const [result] = await connection.query(
                    `INSERT INTO products (
                        barcode, name, brand_name, category, 
                        description, sideEffects, dosage_amount, dosage_unit,
                        price, pieces_per_box, critical, requiresPrescription,
                        is_active, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
                    [
                        product.barcode,
                        product.name,
                        product.brand_name,
                        product.category,
                        product.description || null,
                        product.sideEffects || null,
                        product.dosage_amount,
                        product.dosage_unit,
                        product.price || 50.00,
                        product.pieces_per_box || 1,
                        product.critical || 10,
                        product.requiresPrescription || false
                    ]
                );
                console.log('Created new product:', {
                    product_id: result.insertId,
                    barcode: product.barcode,
                    name: product.name,
                    brand_name: product.brand_name
                });
                product_id = result.insertId;
            }
        }

        await connection.commit();
        console.log('Bulk import processed successfully');
        res.json({ message: 'Import completed successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('Error processing bulk import:', error);
        res.status(500).json({ message: 'Error processing import' });
    } finally {
        connection.release();
    }
};

const getArchivedSuppliers = async (req, res) => {
    try {
        const [archives] = await db.pool.query(`
            SELECT sa.*, s.is_active, u.name as archived_by_name
            FROM supplier_archives sa
            JOIN suppliers s ON sa.supplier_id = s.supplier_id
            JOIN users u ON sa.archived_by = u.user_id
            ORDER BY sa.archived_at DESC
        `);
        console.log('Fetched archived suppliers');
        res.json(archives);
    } catch (error) {
        console.error('Error fetching archived suppliers:', error);
        res.status(500).json({ message: 'Error fetching archived suppliers' });
    }
};

const archiveSupplier = async (req, res) => {
    const { supplier_id } = req.params;
    const { archive_reason } = req.body;
    const archived_by = req.user.user_id;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        // Get supplier details before archiving
        const [supplier] = await connection.query(
            'SELECT * FROM suppliers WHERE supplier_id = ?',
            [supplier_id]
        );

        if (supplier.length === 0) {
            throw new Error('Supplier not found');
        }

        // Create archive record
        await connection.query(`
            INSERT INTO supplier_archives (
                supplier_id, supplier_name, contact_person, email, phone, address,
                archived_by, archive_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            supplier_id,
            supplier[0].supplier_name,
            supplier[0].contact_person,
            supplier[0].email,
            supplier[0].phone,
            supplier[0].address,
            archived_by,
            archive_reason
        ]);

        // Update supplier as archived
        await connection.query(
            'UPDATE suppliers SET is_archived = true WHERE supplier_id = ?',
            [supplier_id]
        );

        await connection.commit();
        console.log('Supplier archived successfully:', {
            supplier_id,
            archived_by,
            archive_reason
        });
        res.json({ message: 'Supplier archived successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving supplier:', error);
        res.status(500).json({ message: 'Error archiving supplier' });
    } finally {
        connection.release();
    }
};

const restoreSupplier = async (req, res) => {
    const { archive_id } = req.params;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        // Get archive details
        const [archive] = await connection.query(
            'SELECT supplier_id FROM supplier_archives WHERE archive_id = ?',
            [archive_id]
        );

        if (archive.length === 0) {
            throw new Error('Archive record not found');
        }

        // Update supplier as not archived
        await connection.query(
            'UPDATE suppliers SET is_archived = false WHERE supplier_id = ?',
            [archive[0].supplier_id]
        );

        // Delete archive record
        await connection.query(
            'DELETE FROM supplier_archives WHERE archive_id = ?',
            [archive_id]
        );

        await connection.commit();
        console.log('Supplier restored successfully:', {
            archive_id,
            supplier_id: archive[0].supplier_id
        });
        res.json({ message: 'Supplier restored successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error restoring supplier:', error);
        res.status(500).json({ message: 'Error restoring supplier' });
    } finally {
        connection.release();
    }
};

const bulkArchiveSuppliers = async (req, res) => {
    const { supplier_ids, archive_reason } = req.body;
    const archived_by = req.user.user_id;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const supplier_id of supplier_ids) {
            // Get supplier details
            const [supplier] = await connection.query(
                'SELECT * FROM suppliers WHERE supplier_id = ?',
                [supplier_id]
            );

            if (supplier.length > 0) {
                // Create archive record
                await connection.query(`
                    INSERT INTO supplier_archives (
                        supplier_id, supplier_name, contact_person, email, phone, address,
                        archived_by, archive_reason
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    supplier_id,
                    supplier[0].supplier_name,
                    supplier[0].contact_person,
                    supplier[0].email,
                    supplier[0].phone,
                    supplier[0].address,
                    archived_by,
                    archive_reason
                ]);

                // Update supplier as archived
                await connection.query(
                    'UPDATE suppliers SET is_archived = true WHERE supplier_id = ?',
                    [supplier_id]
                );
            }
        }

        await connection.commit();
        console.log('Suppliers archived successfully:', {
            supplier_ids,
            archived_by,
            archive_reason
        });
        res.json({ message: 'Suppliers archived successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving suppliers:', error);
        res.status(500).json({ message: 'Error archiving suppliers' });
    } finally {
        connection.release();
    }
};

const bulkRestoreSuppliers = async (req, res) => {
    const { archive_ids } = req.body;
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const archive_id of archive_ids) {
            // Get archive details
            const [archive] = await connection.query(
                'SELECT supplier_id FROM supplier_archives WHERE archive_id = ?',
                [archive_id]
            );

            if (archive.length > 0) {
                // Update supplier as not archived
                await connection.query(
                    'UPDATE suppliers SET is_archived = false WHERE supplier_id = ?',
                    [archive[0].supplier_id]
                );

                // Delete archive record
                await connection.query(
                    'DELETE FROM supplier_archives WHERE archive_id = ?',
                    [archive_id]
                );
            }
        }

        await connection.commit();
        console.log('Suppliers restored successfully:', { archive_ids });
        res.json({ message: 'Suppliers restored successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error restoring suppliers:', error);
        res.status(500).json({ message: 'Error restoring suppliers' });
    } finally {
        connection.release();
    }
};

module.exports = {
    // Supplier Management
    getAllSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getProductSuppliers,
    addProductSupplier,
    updateProductSupplier,
    removeProductSupplier,
    
    // Price Management
    getProductPriceHistory,
    calculateProductPrice,

    // Bulk Import
    validateBulkImport,
    searchProduct,
    processBulkImport,

    // Add getCategories to exports
    getCategories,

    // Archive Management
    getArchivedSuppliers,
    archiveSupplier,
    restoreSupplier,
    bulkArchiveSuppliers,
    bulkRestoreSuppliers
}; 