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
      discountType,
      discountAmount,
      discountIdNumber,
      paymentMethod = 'CASH',
      items = [],
      subtotal,
      discountedSubtotal,
      vat,
      total,
      amountTendered,
      change,
      pointsUsed = 0,
      referenceNumber = null
    } = req.body;

    console.log('Transaction details:', {
      paymentMethod,
      amountTendered,
      total,
      items: items.length
    });

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

    // Calculate points earned (1:200 ratio)
    const pointsEarned = Math.round((subtotal / 200) * 100) / 100;

    // Get customer_id and star_points_id
    let customerId = null;
    let starPointsRecordId = null;

    if (starPointsId && starPointsId !== '001') {
      const [customer] = await connection.query(
        `SELECT c.customer_id, sp.star_points_id, sp.points_balance 
         FROM customers c
         LEFT JOIN star_points sp ON c.customer_id = sp.customer_id
         WHERE c.card_id = ?`,
        [starPointsId]
      );

      if (customer.length > 0) {
        customerId = customer[0].customer_id;
        starPointsRecordId = customer[0].star_points_id;

        // Handle points redemption if using points discount
        if (discountType === 'Points' && pointsUsed > 0) {
          // Update star_points balance
          await connection.query(
            `UPDATE star_points 
             SET points_balance = points_balance - ?,
                 total_points_redeemed = total_points_redeemed + ?,
                 updated_at = ${getMySQLTimestamp()}
             WHERE star_points_id = ?`,
            [pointsUsed, pointsUsed, starPointsRecordId]
          );

          // Record points redemption transaction
          await connection.query(
            `INSERT INTO star_points_transactions 
             (star_points_id, points_amount, transaction_type, reference_transaction_id, created_at)
             VALUES (?, ?, 'REDEEMED', ?, ${getMySQLTimestamp()})`,
            [starPointsRecordId, pointsUsed, invoiceNumber]
          );
        }

        // Add earned points
        if (pointsEarned > 0) {
          // Update star_points balance
          await connection.query(
            `UPDATE star_points 
             SET points_balance = points_balance + ?,
                 total_points_earned = total_points_earned + ?,
                 updated_at = ${getMySQLTimestamp()}
             WHERE star_points_id = ?`,
            [pointsEarned, pointsEarned, starPointsRecordId]
          );

          // Record points earned transaction
          await connection.query(
            `INSERT INTO star_points_transactions 
             (star_points_id, points_amount, transaction_type, reference_transaction_id, created_at)
             VALUES (?, ?, 'EARNED', ?, ${getMySQLTimestamp()})`,
            [starPointsRecordId, pointsEarned, invoiceNumber]
          );
        }
      }
    }

    // Insert sale with payment status
    const [saleResult] = await connection.query(
      `INSERT INTO sales SET 
        invoice_number = ?,
        customer_id = ?,
        total_amount = ?,
        discount_amount = ?,
        discount_type = ?,
        discount_id_number = ?,
        payment_method = ?,
        payment_status = ?,
        branch_id = ?,
        pharmacist_session_id = ?,
        points_earned = ?,
        points_redeemed = ?,
        created_at = ${getMySQLTimestamp()},
        daily_sequence = ?`,
      [
        invoiceNumber,
        customerId || 1,
        total || 0,
        discountAmount || 0,
        discountType || 'None',
        discountIdNumber || null,
        (paymentMethod || 'CASH').toLowerCase(),
        'paid', // Set initial payment status
        branchId,
        pharmacistSessionId,
        pointsEarned || 0,
        pointsUsed || 0,
        dailySequence
      ]
    );

    const saleId = saleResult.insertId;

    // Insert sale items and update inventory
    if (Array.isArray(items)) {
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
    }

    // Insert payment with proper validation
    const paymentAmount = parseFloat(amountTendered);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Invalid payment amount');
    }

    await connection.query(
      `INSERT INTO sales_payments SET 
        sale_id = ?,
        payment_method = ?,
        amount = ?,
        reference_number = ?,
        created_at = ${getMySQLTimestamp()}`,
      [
        saleId, 
        paymentMethod.toLowerCase(), 
        paymentAmount,
        referenceNumber
      ]
    );

    // Update sales session
    await connection.query(
      `UPDATE sales_sessions 
       SET total_sales = total_sales + ?
       WHERE session_id = ?`,
      [total, salesSessionId]
    );

    await connection.commit();
    
    console.log('Transaction completed successfully:', {
      invoiceNumber,
      saleId,
      paymentMethod,
      amountTendered: paymentAmount,
      total
    });
    
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
      message: 'Error completing transaction',
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
      customerId,
      doctorName,
      licenseNumber,
      prescriptionDate,
      expiryDate,
      notes,
      items
    } = req.body;

    // Handle image upload
    let imageData = null;
    let imageType = null;
    if (req.files && req.files.image) {
      const file = req.files.image;
      imageData = file.data;
      imageType = file.mimetype.split('/')[1].toUpperCase();
    }

    // Insert prescription
    const [result] = await connection.query(
      `INSERT INTO prescriptions SET
        customer_id = ?,
        doctor_name = ?,
        doctor_license_number = ?,
        prescription_date = ?,
        expiry_date = ?,
        notes = ?,
        image_data = ?,
        image_type = ?,
        image_upload_date = ${getMySQLTimestamp()},
        status = 'ACTIVE',
        created_at = ${getMySQLTimestamp()},
        updated_at = ${getMySQLTimestamp()}`,
      [
        customerId,
        doctorName,
        licenseNumber,
        prescriptionDate,
        expiryDate,
        notes,
        imageData,
        imageType
      ]
    );

    // Insert prescription items
    for (const item of items) {
      await connection.query(
        `INSERT INTO prescription_items SET
          prescription_id = ?,
          product_id = ?,
          prescribed_quantity = ?,
          dispensed_quantity = 0,
          dosage_instructions = ?,
          created_at = ${getMySQLTimestamp()},
          updated_at = ${getMySQLTimestamp()}`,
        [
          result.insertId,
          item.id,
          item.quantity,
          item.dosage_instructions || null
        ]
      );
    }

    await connection.commit();
    
    console.log('Prescription created:', {
      prescriptionId: result.insertId,
      items: items.length
    });

    res.json({
      success: true,
      prescriptionId: result.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating prescription'
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
            originalInvoiceNumber,
            returnItems,
            returnReason,
            pharmacistSessionId
        } = req.body;

        console.log('Processing return:', {
            invoice: originalInvoiceNumber,
            itemCount: returnItems.length,
            reason: returnReason
        });

        // Get original sale
        const [sale] = await connection.query(
            `SELECT * FROM sales WHERE invoice_number = ?`,
            [originalInvoiceNumber]
        );

        if (!sale.length) {
            throw new Error('Original sale not found');
        }

        // Calculate return amount
        const returnAmount = returnItems.reduce(
            (sum, item) => sum + (item.price * item.returnQuantity),
            0
        );

        // Create return record
        const [returnResult] = await connection.query(
            `INSERT INTO returns 
             (original_sale_id, return_amount, reason, 
              pharmacist_session_id, status, created_at)
             VALUES (?, ?, ?, ?, 'PENDING', ${getMySQLTimestamp()})`,
            [sale[0].id, returnAmount, returnReason, pharmacistSessionId]
        );

        // Insert return items
        for (const item of returnItems) {
            await connection.query(
                `INSERT INTO return_items 
                 (return_id, product_id, quantity, unit_price)
                 VALUES (?, ?, ?, ?)`,
                [returnResult.insertId, item.id, item.returnQuantity, item.price]
            );
        }

        await connection.commit();

        console.log('Return processed successfully:', {
            returnId: returnResult.insertId,
            amount: returnAmount
        });

        res.json({
            success: true,
            message: 'Return processed successfully',
            returnId: returnResult.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error processing return:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing return'
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
    console.log('Searching for customer with card:', cardId);
    
    const [customer] = await db.pool.query(
      `SELECT c.*, sp.points_balance 
       FROM customers c
       LEFT JOIN star_points sp ON c.customer_id = sp.customer_id
       WHERE c.card_id = ?`,
      [cardId]
    );
    
    if (customer.length === 0) {
      console.log('No customer found with card:', cardId);
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    console.log('Customer found:', customer[0]);
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
    
    // Insert customer with card_id
    const [customerResult] = await connection.query(
      `INSERT INTO customers (
        name, phone, address, 
        discount_type, discount_id_number, card_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
      [name, phone, address, discountType, discountId, cardId]
    );
    
    // Initialize star points
    await connection.query(
      `INSERT INTO star_points (
        customer_id, points_balance, total_points_earned,
        total_points_redeemed, created_at, updated_at
      ) VALUES (?, 0, 0, 0, ${getMySQLTimestamp()}, ${getMySQLTimestamp()})`,
      [customerResult.insertId]
    );
    
    // Get the complete customer data
    const [customer] = await connection.query(
      `SELECT c.*, sp.points_balance 
       FROM customers c
       LEFT JOIN star_points sp ON c.customer_id = sp.customer_id
       WHERE c.customer_id = ?`,
      [customerResult.insertId]
    );
    
    await connection.commit();
    
    console.log('Customer created:', {
      customerId: customerResult.insertId,
      cardId: cardId,
      customerData: customer[0]
    });
    
    res.json({ 
      success: true,
      data: customer[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: 'Error creating customer' });
  } finally {
    connection.release();
  }
};

const generateInvoiceNumber = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { branchId } = req.query;
    
    // Get branch code
    const [branch] = await connection.query(
      'SELECT branch_code FROM branches WHERE branch_id = ?',
      [branchId]
    );
    
    const branchCode = branch[0].branch_code;
    
    // Get current date components
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // Get daily sequence
    const [sequence] = await connection.query(
      `SELECT COALESCE(MAX(daily_sequence), 0) + 1 as next_sequence 
       FROM sales 
       WHERE branch_id = ? AND DATE(created_at) = CURDATE()`,
      [branchId]
    );
    
    const dailySequence = String(sequence[0].next_sequence).padStart(4, '0');
    
    // Format: J5P-B001-021025-0507-0002 (removed duplicate J5P)
    const invoiceNumber = `${branchCode}-${month}${day}${year}-${hours}${minutes}-${dailySequence}`;
    
    console.log('Generated invoice number:', invoiceNumber);
    res.json({ success: true, invoiceNumber });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    res.status(500).json({ success: false, message: 'Error generating invoice number' });
  } finally {
    connection.release();
  }
};

const getProductStock = async (req, res) => {
  try {
    const { branchId, productId } = req.params;
    
    const [stock] = await db.pool.query(
      `SELECT stock 
       FROM branch_inventory 
       WHERE branch_id = ? AND product_id = ?`,
      [branchId, productId]
    );

    if (stock.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stock not found for this product' 
      });
    }

    console.log('Stock check:', {
      branchId,
      productId,
      stock: stock[0].stock
    });

    res.json({ 
      success: true, 
      stock: stock[0].stock 
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking stock' 
    });
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
    createCustomerWithCard,
    generateInvoiceNumber,
    getProductStock
}; 