const db = require('../config/db');
const { format } = require('date-fns');
const { convertToUTC } = require('../utils/timeZoneUtil');

// Sales Session Management
exports.startSalesSession = async (req, res) => {
    const { branchId } = req.body;
    try {
        console.log(`Starting sales session for branch ${branchId}`);
        
        const [result] = await db.query(
            `INSERT INTO sales_sessions (branch_id, start_time) 
             VALUES (?, ?)`,
            [branchId, convertToUTC(new Date())]
        );

        res.json({ 
            sessionId: result.insertId,
            message: 'Sales session started successfully'
        });
    } catch (error) {
        console.error('Error starting sales session:', error);
        res.status(500).json({ error: 'Failed to start sales session' });
    }
};

exports.endSalesSession = async (req, res) => {
    const { sessionId, totalSales } = req.body;
    try {
        console.log(`Ending sales session ${sessionId} with total sales ${totalSales}`);
        
        await db.query(
            `UPDATE sales_sessions 
             SET end_time = ?, total_sales = ?
             WHERE session_id = ?`,
            [convertToUTC(new Date()), totalSales, sessionId]
        );

        res.json({ message: 'Sales session ended successfully' });
    } catch (error) {
        console.error('Error ending sales session:', error);
        res.status(500).json({ error: 'Failed to end sales session' });
    }
};

exports.getCurrentSession = async (req, res) => {
    const { branchId } = req.params;
    try {
        console.log('Getting current session for branch:', branchId);
        console.log('User from token:', req.user);

        const [sessions] = await db.query(
            `SELECT * FROM sales_sessions 
             WHERE branch_id = ? AND end_time IS NULL
             ORDER BY start_time DESC LIMIT 1`,
            [branchId]
        );

        console.log('Found sessions:', sessions);
        res.json(sessions[0] || null);
    } catch (error) {
        console.error('Error getting current session:', error);
        res.status(500).json({ error: 'Failed to get current session' });
    }
};

// Transaction Management
exports.createTransaction = async (req, res) => {
    const { 
        invoiceNumber,
        customerId,
        pharmacistSessionId,
        customerName,
        totalAmount,
        discountAmount,
        discountType,
        discountIdNumber,
        paymentMethod,
        pointsEarned,
        pointsRedeemed,
        branchId,
        items
    } = req.body;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        console.log(`Creating transaction ${invoiceNumber}`);

        // Insert main sale record
        const [saleResult] = await conn.query(
            `INSERT INTO sales (
                invoice_number, customer_id, pharmacist_session_id,
                customer_name, total_amount, discount_amount,
                discount_type, discount_id_number, payment_method,
                points_earned, points_redeemed, branch_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceNumber, customerId, pharmacistSessionId,
                customerName, totalAmount, discountAmount,
                discountType, discountIdNumber, paymentMethod,
                pointsEarned, pointsRedeemed, branchId,
                convertToUTC(new Date())
            ]
        );

        const saleId = saleResult.insertId;

        // Insert sale items and update inventory
        for (const item of items) {
            await conn.query(
                `INSERT INTO sale_items (
                    sale_id, product_id, quantity, unit_price,
                    total_price, SKU, prescription_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    saleId, item.id, item.quantity, item.price,
                    item.quantity * item.price, item.SKU || 'Piece',
                    item.prescriptionId, convertToUTC(new Date())
                ]
            );

            // Update inventory
            await conn.query(
                `UPDATE branch_inventory 
                 SET stock = stock - ?
                 WHERE branch_id = ? AND product_id = ?`,
                [item.quantity, branchId, item.id]
            );
        }

        // Update customer points if applicable
        if (customerId && (pointsEarned || pointsRedeemed)) {
            await conn.query(
                `INSERT INTO star_points_transactions (
                    star_points_id, points_amount, transaction_type,
                    reference_transaction_id, created_at
                ) VALUES 
                (?, ?, 'EARNED', ?, ?),
                (?, ?, 'REDEEMED', ?, ?)`,
                [
                    customerId, pointsEarned, saleId, convertToUTC(new Date()),
                    customerId, -pointsRedeemed, saleId, convertToUTC(new Date())
                ]
            );
        }

        await conn.commit();
        res.json({ 
            saleId,
            message: 'Transaction created successfully'
        });
    } catch (error) {
        await conn.rollback();
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    } finally {
        conn.release();
    }
};

// Product Search
exports.searchProducts = async (req, res) => {
    const { query, barcode } = req.query;
    const { branchId } = req.params;

    try {
        console.log('Searching products:', { query, barcode, branchId });
        console.log('User from token:', req.user);

        let sql = `
            SELECT 
                p.*,
                c.name as category,
                COALESCE(bi.stock, 0) as stock,
                CASE 
                    WHEN bi.branch_id IS NULL THEN false
                    ELSE true
                END as is_in_branch
            FROM products p
            LEFT JOIN category c ON p.category = c.category_id
            LEFT JOIN branch_inventory bi ON p.id = bi.product_id 
                AND bi.branch_id = ?
            WHERE p.is_active = 1
        `;

        const params = [branchId];
        if (barcode) {
            sql += ` AND p.barcode = ?`;
            params.push(barcode);
        } else if (query) {
            sql += ` AND (
                p.name LIKE ? OR 
                p.brand_name LIKE ? OR 
                p.barcode LIKE ? OR
                c.name LIKE ?
            )`;
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Order by stock availability and name
        sql += ` ORDER BY stock DESC, p.name ASC LIMIT 10`;

        console.log('Executing SQL:', sql, params);
        const [products] = await db.query(sql, params);
        console.log('Found products:', products.length);

        res.json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
};

// Get Transaction
exports.getTransaction = async (req, res) => {
    const { invoiceNumber } = req.params;
    try {
        const [sales] = await db.query(
            `SELECT s.*, 
                    c.name as customer_name,
                    c.discount_type as customer_discount_type,
                    c.discount_id_number as customer_discount_id
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.customer_id
             WHERE s.invoice_number = ?`,
            [invoiceNumber]
        );

        if (sales.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const sale = sales[0];

        // Get sale items
        const [items] = await db.query(
            `SELECT si.*, p.name, p.brand_name, p.barcode
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [sale.id]
        );

        res.json({
            ...sale,
            items
        });
    } catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({ error: 'Failed to get transaction' });
    }
};

// Hold Transaction
exports.holdTransaction = async (req, res) => {
    const { salesSessionId, customerId, items, holdNumber, note } = req.body;
    const conn = await db.getConnection();
    
    try {
        await conn.beginTransaction();
        console.log(`Holding transaction with ${items.length} items`);

        // Get branch_id from sales session
        const [sessions] = await conn.query(
            'SELECT branch_id FROM sales_sessions WHERE session_id = ?',
            [salesSessionId]
        );

        if (sessions.length === 0) {
            throw new Error('Invalid sales session');
        }

        const branchId = sessions[0].branch_id;

        // Insert held transaction
        const [result] = await conn.query(
            `INSERT INTO held_transactions (
                sales_session_id, branch_id, hold_number,
                customer_id, total_amount, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                salesSessionId,
                branchId,
                holdNumber,
                customerId,
                items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
                note,
                convertToUTC(new Date())
            ]
        );

        const heldTransactionId = result.insertId;

        // Insert held items
        for (const item of items) {
            await conn.query(
                `INSERT INTO held_transaction_items (
                    held_transaction_id, product_id, quantity,
                    unit_price, subtotal, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    heldTransactionId,
                    item.id,
                    item.quantity,
                    item.price,
                    item.quantity * item.price,
                    convertToUTC(new Date())
                ]
            );
        }

        await conn.commit();
        res.json({
            heldTransactionId,
            message: 'Transaction held successfully'
        });
    } catch (error) {
        await conn.rollback();
        console.error('Error holding transaction:', error);
        res.status(500).json({ error: 'Failed to hold transaction' });
    } finally {
        conn.release();
    }
};

// Get Held Transactions
exports.getHeldTransactions = async (req, res) => {
    const { salesSessionId } = req.query;
    try {
        const [transactions] = await db.query(
            `SELECT ht.*, 
                    c.name as customer_name,
                    COUNT(hti.id) as item_count
             FROM held_transactions ht
             LEFT JOIN customers c ON ht.customer_id = c.customer_id
             LEFT JOIN held_transaction_items hti ON ht.id = hti.held_transaction_id
             WHERE ht.sales_session_id = ?
             GROUP BY ht.id
             ORDER BY ht.created_at DESC`,
            [salesSessionId]
        );

        res.json(transactions);
    } catch (error) {
        console.error('Error getting held transactions:', error);
        res.status(500).json({ error: 'Failed to get held transactions' });
    }
};

// Delete Held Transaction
exports.deleteHeldTransaction = async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    
    try {
        await conn.beginTransaction();
        console.log(`Deleting held transaction ${id}`);

        // Delete held items first
        await conn.query(
            'DELETE FROM held_transaction_items WHERE held_transaction_id = ?',
            [id]
        );

        // Delete held transaction
        await conn.query(
            'DELETE FROM held_transactions WHERE id = ?',
            [id]
        );

        await conn.commit();
        res.json({ message: 'Held transaction deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error deleting held transaction:', error);
        res.status(500).json({ error: 'Failed to delete held transaction' });
    } finally {
        conn.release();
    }
};

// Recall Held Transaction
exports.recallHeldTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        // Get held transaction with items
        const [transactions] = await db.query(
            `SELECT ht.*, 
                    c.name as customer_name,
                    c.customer_id,
                    c.discount_type,
                    c.discount_id_number
             FROM held_transactions ht
             LEFT JOIN customers c ON ht.customer_id = c.customer_id
             WHERE ht.id = ?`,
            [id]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Held transaction not found' });
        }

        const [items] = await db.query(
            `SELECT hti.*, 
                    p.name, p.brand_name, p.barcode,
                    p.requiresPrescription, p.pieces_per_box
             FROM held_transaction_items hti
             JOIN products p ON hti.product_id = p.id
             WHERE hti.held_transaction_id = ?`,
            [id]
        );

        res.json({
            ...transactions[0],
            items
        });
    } catch (error) {
        console.error('Error recalling held transaction:', error);
        res.status(500).json({ error: 'Failed to recall held transaction' });
    }
};

// Process Return
exports.processReturn = async (req, res) => {
    const { saleId, items, reason, pharmacistId } = req.body;
    const conn = await db.getConnection();
    
    try {
        await conn.beginTransaction();
        console.log(`Processing return for sale ${saleId}`);

        for (const item of items) {
            // Insert return record
            const [result] = await conn.query(
                `INSERT INTO sales_returns (
                    sale_id, product_id, quantity, reason,
                    refund_amount, pharmacist_id, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)`,
                [
                    saleId,
                    item.productId,
                    item.quantity,
                    reason,
                    item.refundAmount,
                    pharmacistId,
                    convertToUTC(new Date())
                ]
            );

            // Update inventory
            await conn.query(
                `UPDATE branch_inventory 
                 SET stock = stock + ?
                 WHERE branch_id = (
                     SELECT branch_id FROM sales WHERE id = ?
                 ) AND product_id = ?`,
                [item.quantity, saleId, item.productId]
            );
        }

        await conn.commit();
        res.json({ message: 'Return processed successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error processing return:', error);
        res.status(500).json({ error: 'Failed to process return' });
    } finally {
        conn.release();
    }
};

// Get Return
exports.getReturn = async (req, res) => {
    const { id } = req.params;
    try {
        const [returns] = await db.query(
            `SELECT sr.*, 
                    p.name as product_name,
                    ph.name as pharmacist_name,
                    s.invoice_number
             FROM sales_returns sr
             JOIN products p ON sr.product_id = p.id
             JOIN pharmacist ph ON sr.pharmacist_id = ph.staff_id
             JOIN sales s ON sr.sale_id = s.id
             WHERE sr.return_id = ?`,
            [id]
        );

        if (returns.length === 0) {
            return res.status(404).json({ error: 'Return not found' });
        }

        res.json(returns[0]);
    } catch (error) {
        console.error('Error getting return:', error);
        res.status(500).json({ error: 'Failed to get return' });
    }
};

// Customer Search
exports.searchCustomers = async (req, res) => {
    const { query } = req.query;
    try {
        const [customers] = await db.query(
            `SELECT c.*, sp.points_balance
             FROM customers c
             LEFT JOIN star_points sp ON c.customer_id = sp.customer_id
             WHERE c.is_archived = 0
             AND (c.name LIKE ? OR c.phone LIKE ? OR c.card_id LIKE ?)
             LIMIT 10`,
            Array(3).fill(`%${query}%`)
        );

        res.json(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ error: 'Failed to search customers' });
    }
};

// Get Customer Points
exports.getCustomerPoints = async (req, res) => {
    const { id } = req.params;
    try {
        const [points] = await db.query(
            `SELECT * FROM star_points WHERE customer_id = ?`,
            [id]
        );

        if (points.length === 0) {
            return res.status(404).json({ error: 'Customer points not found' });
        }

        res.json(points[0]);
    } catch (error) {
        console.error('Error getting customer points:', error);
        res.status(500).json({ error: 'Failed to get customer points' });
    }
};

// Update Customer Points
exports.updateCustomerPoints = async (req, res) => {
    const { customerId, points, transactionType, referenceId } = req.body;
    const conn = await db.getConnection();
    
    try {
        await conn.beginTransaction();
        console.log(`Updating points for customer ${customerId}: ${points} points (${transactionType})`);

        // Update star_points balance
        await conn.query(
            `INSERT INTO star_points (customer_id, points_balance, total_points_earned)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             points_balance = points_balance + ?,
             total_points_earned = total_points_earned + ?`,
            [customerId, points, points, points, Math.max(0, points)]
        );

        // Record transaction
        await conn.query(
            `INSERT INTO star_points_transactions (
                star_points_id, points_amount, transaction_type,
                reference_transaction_id, created_at
            ) VALUES (?, ?, ?, ?, ?)`,
            [customerId, points, transactionType, referenceId, convertToUTC(new Date())]
        );

        await conn.commit();
        res.json({ message: 'Points updated successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Error updating customer points:', error);
        res.status(500).json({ error: 'Failed to update customer points' });
    } finally {
        conn.release();
    }
};
