const db = require('../config/database');
const { getMySQLTimestamp } = require('../utils/timeZoneUtil');

// Product Search/Inquiry (F1)
const searchProducts = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        const { query, branchId } = req.query;
        
        console.log('Search request received:', { query, branchId });

        if (!query || !branchId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        if (query.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 3 characters'
            });
        }

        const searchPattern = `%${query}%`;
        
        const sqlQuery = `
            SELECT 
                p.id,
                p.name,
                p.brand_name,
                p.barcode,
                p.price,
                p.requiresPrescription,
                COALESCE(bi.stock, 0) as stock,
                bi.expiryDate as expiryDate,
                c.name as category_name,
                p.dosage_amount,
                p.dosage_unit,
                p.pieces_per_box
            FROM products p
            LEFT JOIN branch_inventory bi ON 
                p.id = bi.product_id AND 
                bi.branch_id = ? AND 
                bi.is_active = 1
            LEFT JOIN category c ON p.category = c.category_id
            WHERE p.is_active = 1
                AND (p.name LIKE ? 
                OR p.brand_name LIKE ? 
                OR p.barcode LIKE ?)
            ORDER BY
                CASE 
                    WHEN p.barcode = ? THEN 1
                    WHEN p.name LIKE ? THEN 2
                    WHEN p.brand_name LIKE ? THEN 3
                    ELSE 4
                END,
                p.name ASC
            LIMIT 50`;

        const [products] = await connection.query(sqlQuery, [
            branchId,
            searchPattern,
            searchPattern,
            searchPattern,
            query,
            `${query}%`,
            `${query}%`
        ]);

        // Convert numeric fields to Numbers
        const processedProducts = products.map(product => ({
            ...product,
            price: Number(product.price),
            stock: Number(product.stock),
            dosage_amount: product.dosage_amount ? Number(product.dosage_amount) : null,
            pieces_per_box: Number(product.pieces_per_box)
        }));

        res.json(processedProducts);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Database operation failed',
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

// Hold Transaction (F3)
const holdTransaction = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            salesSessionId, 
            branchId, 
            customerId, 
            items, 
            totalAmount,
            note 
        } = req.body;

        console.log('Holding transaction:', {
            salesSessionId,
            branchId,
            customerId,
            itemCount: items.length,
            totalAmount
        });

        // Get next hold number for this session
        const [holdCount] = await connection.query(
            'SELECT COUNT(*) as count FROM held_transactions WHERE sales_session_id = ?',
            [salesSessionId]
        );
        const holdNumber = holdCount[0].count + 1;

        // Insert held transaction
        const [result] = await connection.query(
            `INSERT INTO held_transactions SET 
                hold_number = ?,
                sales_session_id = ?,
                branch_id = ?,
                customer_id = COALESCE(?, 1),
                total_amount = ?,
                note = ?,
                created_at = ${getMySQLTimestamp()}`,
            [holdNumber, salesSessionId, branchId, customerId, totalAmount, note]
        );

        const heldTransactionId = result.insertId;

        // Insert held items
        for (const item of items) {
            await connection.query(
                `INSERT INTO held_transaction_items (
                    held_transaction_id, product_id,
                    quantity, unit_price, subtotal
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    heldTransactionId,
                    item.productId,
                    item.quantity,
                    item.unitPrice,
                    item.subtotal
                ]
            );
        }

        await connection.commit();
        console.log('Transaction held successfully:', {
            heldTransactionId,
            holdNumber,
            itemCount: items.length
        });

        res.json({
            success: true,
            message: 'Transaction held successfully',
            holdNumber,
            heldTransactionId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error holding transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error holding transaction'
        });
    } finally {
        connection.release();
    }
};

// Recall Transaction (F4)
const getHeldTransactions = async (req, res) => {
    try {
        const { salesSessionId } = req.params;
        const showAll = req.query.showAll === 'true';

        const query = `
            SELECT 
                ht.id,
                ht.hold_number,
                CAST(ht.total_amount AS DECIMAL(10,2)) as total_amount,
                ht.created_at as created_at,
                COALESCE(c.name, 'Walk-in Customer') AS customer_name,
                COALESCE(GROUP_CONCAT(
                    CONCAT(p.name, ' (', hti.quantity, 'x)') 
                    SEPARATOR ', '
                ), 'No items') AS items_summary,
                ht.is_active
            FROM held_transactions ht
            LEFT JOIN customers c ON ht.customer_id = c.customer_id
            LEFT JOIN held_transaction_items hti 
                ON ht.id = hti.held_transaction_id
                AND hti.is_active = 1
            LEFT JOIN products p ON hti.product_id = p.id
            WHERE ht.sales_session_id = ?
            ${!showAll ? 'AND ht.is_active = 1' : ''}
            GROUP BY ht.id
            ORDER BY ht.created_at DESC`;

        const [transactions] = await db.pool.query(query, [salesSessionId]);

        // Convert numeric fields
        const processed = transactions.map(t => ({
            ...t,
            total_amount: Number(t.total_amount)
        }));

        res.json({ success: true, data: processed });
    } catch (error) {
        console.error('Error getting held transactions:', error);
        res.status(500).json({ success: false, message: 'Error getting held transactions' });
    }
};

// Delete held transaction after recall or abandonment
const deleteHeldTransaction = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Update instead of delete
        await connection.query(
            `UPDATE held_transactions 
             SET is_active = 0 
             WHERE id = ?`, 
            [req.params.heldTransactionId]
        );
        
        await connection.query(
            `UPDATE held_transaction_items 
             SET is_active = 0 
             WHERE held_transaction_id = ?`, 
            [req.params.heldTransactionId]
        );
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting held transaction:', error);
        res.status(500).json({ success: false, message: 'Failed to delete transaction' });
    } finally {
        connection.release();
    }
};

const completeTransaction = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      branchId,
      salesSessionId,
      pharmacistSessionId,
      customerName,
      starPointsId,
      discountType = 'None',
      discountAmount = 0,
      discountIdNumber,
      paymentMethod,
      items,
      subtotal,
      discountedSubtotal,
      vat,
      total,
      amountTendered,
      change
    } = req.body;

    // Generate invoice number
    const [branch] = await connection.query(
      'SELECT branch_code FROM branches WHERE branch_id = ?',
      [branchId]
    );
    
    const date = new Date();
    const branchCode = branch[0].branch_code;
    const month = (`0${date.getMonth() + 1}`).slice(-2);
    const day = (`0${date.getDate()}`).slice(-2);
    const year = date.getFullYear().toString().slice(-2);
    const hours = (`0${date.getHours()}`).slice(-2); 
    const minutes = (`0${date.getMinutes()}`).slice(-2);
    
    const formattedDate = month + day + year;
    const time = hours + minutes;
    
    const [sequence] = await connection.query(
      `SELECT COALESCE(MAX(daily_sequence), 0) + 1 as next_sequence 
       FROM sales 
       WHERE branch_id = ? AND DATE(created_at) = CURDATE()`,
      [branchId]
    );
    
    const dailySequence = sequence[0].next_sequence.toString().padStart(4, '0');
    const invoiceNumber = `${branchCode}-${formattedDate}-${time}-${dailySequence}`;

    // Calculate points earned (example: 1 point per 100 pesos)
    const pointsEarned = Math.floor(subtotal / 200);

    // Handle points redemption
    if (discountType === 'Points') {
      const [points] = await connection.query(
        'SELECT points_balance FROM star_points WHERE customer_id = ?',
        [req.body.customerId]
      );
      
      const maxRedeemable = Math.floor(subtotal / 100);
      const pointsToRedeem = Math.min(points[0].points_balance, maxRedeemable);
      
      await connection.query(
        'UPDATE star_points SET points_balance = points_balance - ? WHERE customer_id = ?',
        [pointsToRedeem, req.body.customerId]
      );
    }

    // Insert sale
    const [saleResult] = await connection.query(
      `INSERT INTO sales SET 
        invoice_number = ?,
        customer_id = ?,
        total_amount = ?,
        discount_amount = ?,
        discount_type = ?,
        discount_id_number = ?,
        payment_method = ?,
        branch_id = ?,
        pharmacist_session_id = ?,
        points_earned = ?,
        points_redeemed = ?,
        created_at = ${getMySQLTimestamp()},
        daily_sequence = ?`,
      [
        invoiceNumber,
        req.body.customerId,
        total,
        discountAmount,
        discountType,
        discountIdNumber,
        paymentMethod,
        branchId,
        pharmacistSessionId,
        pointsEarned,
        discountType === 'Points' ? pointsToRedeem : 0,
        dailySequence
      ]
    );

    const saleId = saleResult.insertId;

    // Insert sale items and update inventory
    for (const item of items) {
      await connection.query(
        `INSERT INTO sale_items SET 
          sale_id = ?,
          product_id = ?,
          quantity = ?,
          unit_price = ?,
          total_price = ?`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );

      await connection.query(
        `UPDATE branch_inventory 
         SET stock = stock - ?
         WHERE branch_id = ? AND product_id = ?`,
        [item.quantity, branchId, item.product_id]
      );
    }

    // Insert payment
    await connection.query(
      `INSERT INTO sales_payments SET 
        sale_id = ?,
        payment_method = ?,
        amount = ?,
        reference_number = ?,
        created_at = ${getMySQLTimestamp()}`,
      [saleId, paymentMethod, amountTendered, null]
    );

    // Update sales session
    await connection.query(
      `UPDATE sales_sessions 
       SET total_sales = total_sales + ?
       WHERE session_id = ?`,
      [total, salesSessionId]
    );

    await connection.commit();
    
    console.log(`Transaction completed: ${invoiceNumber}`);
    
    res.json({
      success: true,
      saleId,
      invoiceNumber,
      dailySequence,
      pointsEarned,
      message: 'Transaction completed successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error completing transaction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to complete transaction',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

const searchByBarcode = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        const { barcode } = req.params;
        const { branchId } = req.query;

        console.log('Barcode search request:', {
            barcode,
            branchId,
            timestamp: new Date().toISOString()
        });

        const [products] = await connection.query(`
            SELECT 
                p.id,
                p.name,
                p.brand_name,
                p.barcode,
                p.price,
                p.requiresPrescription,
                COALESCE(bi.stock, 0) as stock,
                bi.expiryDate as expiryDate,
                c.name as category_name,
                p.dosage_amount,
                p.dosage_unit,
                p.pieces_per_box
            FROM products p
            LEFT JOIN branch_inventory bi 
                ON p.id = bi.product_id 
                AND bi.branch_id = ?
                AND bi.is_active = 1
            LEFT JOIN category c 
                ON p.category = c.category_id
            WHERE p.barcode = ? 
                AND p.is_active = 1
            LIMIT 1`,
            [branchId, barcode]
        );

        if (products.length === 0) {
            console.log(`No product found for barcode: ${barcode}`);
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log('Product found:', {
            barcode,
            productId: products[0].id,
            name: products[0].name
        });

        // Convert numeric fields to Numbers
        const processedProducts = products.map(product => ({
            ...product,
            price: Number(product.price),
            stock: Number(product.stock),
            dosage_amount: product.dosage_amount ? Number(product.dosage_amount) : null,
            pieces_per_box: Number(product.pieces_per_box)
        }));

        res.json(processedProducts[0]);
    } catch (error) {
        console.error('Barcode search error:', error);
        res.status(500).json({ error: 'Database error' });
    } finally {
        connection.release();
    }
};

const createPrescription = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            patientName,
            age,
            doctorName,
            prcNumber,
            prescriptionDate,
            prescriptionNumber,
            diagnosis,
            notes,
            items // array of prescribed items
        } = req.body;

        // Insert into prescriptions table
        const [result] = await connection.query(
            `INSERT INTO prescriptions (
                patient_name,
                patient_age,
                doctor_name,
                prc_number,
                prescription_date,
                prescription_number,
                diagnosis,
                notes,
                created_at,
                pharmacist_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${getMySQLTimestamp()}, ?)`,
            [
                patientName,
                age,
                doctorName,
                prcNumber,
                prescriptionDate,
                prescriptionNumber,
                diagnosis,
                notes,
                req.user.id // from auth middleware
            ]
        );

        const prescriptionId = result.insertId;

        // Insert prescribed items
        if (items && items.length > 0) {
            for (const item of items) {
                await connection.query(
                    `INSERT INTO prescription_items (
                        prescription_id,
                        product_id,
                        quantity,
                        instructions
                    ) VALUES (?, ?, ?, ?)`,
                    [prescriptionId, item.productId, item.quantity, item.instructions]
                );
            }
        }

        await connection.commit();
        console.log('Prescription created:', prescriptionId);

        res.json({
            success: true,
            prescriptionId,
            message: 'Prescription created successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create prescription'
        });
    } finally {
        connection.release();
    }
};

const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get transaction details with items
        const [transaction] = await db.pool.query(
            `SELECT 
                s.id,
                s.total_amount,
                s.created_at as date,
                s.payment_status,
                si.id as item_id,
                si.product_id,
                si.quantity,
                si.unit_price,
                p.name as product_name
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.id = ? AND s.is_active = 1`,
            [id]
        );

        if (transaction.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Format response
        const formattedTransaction = {
            id: transaction[0].id,
            date: transaction[0].date,
            total: transaction[0].total_amount,
            status: transaction[0].payment_status,
            items: transaction.map(item => ({
                id: item.item_id,
                productId: item.product_id,
                name: item.product_name,
                quantity: item.quantity,
                price: item.unit_price
            }))
        };

        console.log('Transaction retrieved:', id);
        res.json(formattedTransaction);
    } catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transaction'
        });
    }
};

const processReturn = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            transactionId,
            items,
            reason,
            pharmacistSessionId
        } = req.body;

        // Calculate total return amount
        const totalAmount = items.reduce((sum, item) => 
            sum + (item.returnQuantity * item.price), 0
        );

        // Insert into sales_returns table
        const [result] = await connection.query(
            `INSERT INTO sales_returns (
                sale_id,
                product_id,
                quantity,
                reason,
                refund_amount,
                pharmacist_id,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ${getMySQLTimestamp()})`,
            [transactionId, item.productId, item.returnQuantity, reason, item.price * item.returnQuantity, pharmacistSessionId]
        );
        console.log('Sales return recorded:', { transactionId, item });


        const returnId = result.insertId;

        // Process each returned item
        for (const item of items) {
            if (item.returnQuantity > 0) {
                // Insert return items
                await connection.query(
                    `INSERT INTO return_items (
                        return_id,
                        product_id,
                        quantity,
                        unit_price,
                        subtotal
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        returnId,
                        item.productId,
                        item.returnQuantity,
                        item.price,
                        item.returnQuantity * item.price
                    ]
                );

                // Update inventory
                await connection.query(
                    `UPDATE branch_inventory 
                     SET stock = stock + ?,
                         updatedAt = ${getMySQLTimestamp()}
                     WHERE branch_id = ? AND product_id = ?`,
                    [item.returnQuantity, req.user.branchId, item.productId]
                );
            }
        }

        await connection.commit();
        console.log('Return processed:', returnId);

        res.json({
            success: true,
            returnId,
            message: 'Return processed successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error processing return:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process return'
        });
    } finally {
        connection.release();
    }
};

const getNextSequence = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { branchId } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    // Get the current daily sequence for this branch and date
    const [rows] = await connection.query(
      `SELECT COALESCE(MAX(daily_sequence), 0) + 1 as next_sequence 
       FROM sales 
       WHERE DATE(created_at) = ? AND branch_id = ?`,
      [today, branchId]
    );

    console.log(`Generated next sequence for branch ${branchId}:`, rows[0].next_sequence);

    res.json({
      daily_sequence: rows[0].next_sequence,
      branch_id: branchId,
      date: today
    });
  } catch (error) {
    console.error('Error getting next sequence:', error);
    res.status(500).json({ error: 'Failed to generate sequence' });
  } finally {
    connection.release();
  }
};

const createSalesSession = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { branchId } = req.body;
    const { id: pharmacistId } = req.user;

    const [result] = await connection.query(
      `INSERT INTO sales_sessions SET 
        branch_id = ?,
        start_time = ${getMySQLTimestamp()},
        total_sales = 0.00`,
      [branchId]
    );

    await connection.query(
      `INSERT INTO pharmacist_sessions SET 
        session_id = ?,
        staff_id = ?,
        created_at = ${getMySQLTimestamp()}`,
      [result.insertId, pharmacistId]
    );

    res.json({
      success: true,
      sessionId: result.insertId,
      branchId
    });
  } catch (error) {
    console.error('Error creating sales session:', error);
    res.status(500).json({ success: false, message: 'Failed to start sales session' });
  } finally {
    connection.release();
  }
};

const closeSalesSession = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { sessionId } = req.params;

    await connection.query(
      `UPDATE sales_sessions SET 
        end_time = ${getMySQLTimestamp()}
       WHERE session_id = ?`,
      [sessionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error closing sales session:', error);
    res.status(500).json({ success: false, message: 'Failed to close sales session' });
  } finally {
    connection.release();
  }
};

const getHeldTransactionItems = async (req, res) => {
    try {
        const { heldTransactionId } = req.params;

        const [items] = await db.pool.query(
            `SELECT 
                hti.product_id as id,
                p.name,
                p.brand_name,
                p.barcode,
                hti.quantity,
                hti.unit_price as price,
                hti.subtotal,
                c.name as category_name
            FROM held_transaction_items hti
            JOIN products p ON hti.product_id = p.id
            LEFT JOIN category c ON p.category = c.category_id
            WHERE hti.held_transaction_id = ?`,
            [heldTransactionId]
        );

        console.log(`Retrieved ${items.length} items for held transaction ${heldTransactionId}`);
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error getting held transaction items:', error);
        res.status(500).json({ success: false, message: 'Error getting transaction items' });
    }
};

const getCustomerByCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const [customer] = await db.pool.query(
      `SELECT c.*, sp.points_balance 
       FROM customers c
       JOIN star_points sp ON c.customer_id = sp.customer_id
       WHERE sp.card_id = ?`,
      [cardId]
    );
    
    if (customer.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    res.json({ success: true, data: customer[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer' });
  }
};

const createCustomerWithCard = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { name, phone, address, discountType, discountId, cardId } = req.body;
    
    // Create customer
    const [customerResult] = await connection.query(
      `INSERT INTO customers SET 
        name = ?,
        phone = ?,
        address = ?,
        discount_type = ?,
        discount_id_number = ?,
        created_at = ${getMySQLTimestamp()}`,
      [name, phone, address, discountType, discountId]
    );
    
    // Create star points account
    await connection.query(
      `INSERT INTO star_points SET 
        customer_id = ?,
        card_id = ?,
        points_balance = 0,
        created_at = ${getMySQLTimestamp()}`,
      [customerResult.insertId, cardId]
    );
    
    await connection.commit();
    res.json({ 
      success: true,
      customerId: customerResult.insertId,
      cardId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: 'Error creating customer' });
  } finally {
    connection.release();
  }
};

// Customer Controller



module.exports = {
    searchProducts,
    holdTransaction,
    getHeldTransactions,
    deleteHeldTransaction,
    completeTransaction,
    searchByBarcode,
    createPrescription,
    getTransactionById,
    processReturn,
    getNextSequence,
    createSalesSession,
    closeSalesSession,
    getHeldTransactionItems,
    getCustomerByCard,
    createCustomerWithCard
}; 