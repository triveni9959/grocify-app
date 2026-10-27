const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let DB_PATH = path.join(__dirname, 'grocify.db');

// Handle Vercel serverless read-only filesystem: copy seed DB to /tmp if running in production serverless
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    const tmpDbPath = path.join('/tmp', 'grocify.db');
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, tmpDbPath);
    }
    DB_PATH = tmpDbPath;
  } catch (err) {
    console.warn('[DB] Warning: could not use /tmp/grocify.db, falling back to original path:', err.message);
  }
}

// Connect to SQLite Database
let db;
try {
  db = new Database(DB_PATH, { verbose: null });
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('[DB] WAL or file db failed, attempting in-memory fallback:', e.message);
  db = new Database(':memory:');
}

// Initialize Tables
function initSchema() {
  db.exec(`
    -- Products Table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT DEFAULT 'FRESH CO-OP',
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 10,
      daily_velocity REAL DEFAULT 5,
      depletion_runway TEXT DEFAULT '3 days remaining',
      demand_trend TEXT DEFAULT 'Stable',
      category TEXT DEFAULT 'Groceries',
      tags TEXT DEFAULT 'Fresh',
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customer Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'arjun_01',
      customer_name TEXT DEFAULT 'Arjun',
      items TEXT NOT NULL, -- JSON string of ordered items
      total_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'UPI / QR',
      delivery_address TEXT,
      status TEXT DEFAULT 'Confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory Log Table (Track stock modifications)
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      change_qty INTEGER NOT NULL,
      remaining_stock INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Smart Offers Table
    CREATE TABLE IF NOT EXISTS smart_offers (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      discount_percent INTEGER NOT NULL,
      original_price REAL,
      offer_price REAL,
      reason TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ecosystem Views State Table (Persists all 15 Grocify dynamic views)
    CREATE TABLE IF NOT EXISTS ecosystem_data (
      section TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users Table (Customers & Merchants)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      store_name TEXT DEFAULT 'Sri Lakshmi Stores',
      address TEXT DEFAULT '123/A, Green Valley Apartments, Bangalore',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customer Personal Pantry Inventory & Daily Consumption Table
    CREATE TABLE IF NOT EXISTS pantry_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Grocery',
      unit_type TEXT DEFAULT 'weight',
      display_unit TEXT DEFAULT 'kg',
      purchased_qty REAL NOT NULL,
      base_purchased_qty REAL NOT NULL,
      base_unit TEXT DEFAULT 'g',
      purchase_date TEXT NOT NULL,
      last_updated_date TEXT NOT NULL,
      expiry_date TEXT,
      daily_usage_base REAL DEFAULT 0,
      daily_usage_display REAL DEFAULT 0,
      daily_usage_unit TEXT DEFAULT 'g',
      low_stock_threshold_base REAL DEFAULT 0,
      low_stock_threshold_display REAL DEFAULT 0,
      low_stock_threshold_unit TEXT DEFAULT 'g',
      manual_usage_total_base REAL DEFAULT 0,
      current_stock_base REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initSchema();

// Helper: Seed Default Pantry Items for demo customer (user_arjun)
function seedPantryIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM pantry_items').get().count;
    if (count === 0) {
      const today = new Date();
      const formatD = (d) => d.toISOString().split('T')[0];
      
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const inFiveDays = new Date(today);
      inFiveDays.setDate(inFiveDays.getDate() + 5);

      const inTwoMonths = new Date(today);
      inTwoMonths.setMonth(inTwoMonths.getMonth() + 2);

      const insert = db.prepare(`
        INSERT INTO pantry_items (
          id, user_id, name, category, unit_type, display_unit, purchased_qty, base_purchased_qty,
          base_unit, purchase_date, last_updated_date, expiry_date, daily_usage_base, daily_usage_display,
          daily_usage_unit, low_stock_threshold_base, low_stock_threshold_display, low_stock_threshold_unit,
          manual_usage_total_base, current_stock_base, notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      // 1. Basmati Rice (Available, normal consumption)
      insert.run(
        'pantry_rice_01', 'user_arjun', 'Basmati Rice', 'Food & Grains', 'weight', 'kg', 5, 5000,
        'g', formatD(fiveDaysAgo), formatD(today), formatD(inTwoMonths), 150, 150,
        'g', 500, 500, 'g', 0, 4250, 'Daawat Rozana Premium Basmati'
      );

      // 2. Toor Dal (Low Stock Alert: 240g remaining, threshold 300g)
      insert.run(
        'pantry_dal_02', 'user_arjun', 'Toor Dal (Organic)', 'Dal & Pulses', 'weight', 'kg', 2, 2000,
        'g', formatD(fiveDaysAgo), formatD(today), formatD(inTwoMonths), 80, 80,
        'g', 300, 300, 'g', 0, 240, 'Daily household protein staple'
      );

      // 3. Sunflower Cooking Oil (Near Expiry Alert: expires in 5 days)
      insert.run(
        'pantry_oil_03', 'user_arjun', 'Sunflower Cooking Oil', 'Oils & Ghee', 'volume', 'L', 1, 1000,
        'ml', formatD(fiveDaysAgo), formatD(today), formatD(inFiveDays), 35, 35,
        'ml', 200, 200, 'ml', 0, 825, 'Cold-pressed sunflower oil'
      );

      // 4. Farmhouse Fresh Milk (Out of Stock Alert: 0 remaining)
      insert.run(
        'pantry_milk_04', 'user_arjun', 'Farmhouse Fresh Milk', 'Dairy', 'volume', 'L', 1, 1000,
        'ml', formatD(fiveDaysAgo), formatD(today), formatD(fiveDaysAgo), 500, 500,
        'ml', 250, 250, 'ml', 0, 0, 'Morning pasteurised toned milk'
      );

      console.log('[DB] Seeded default customer pantry inventory items into SQLite.');
    }
  } catch (e) {
    console.warn('[DB] seedPantryIfEmpty warning:', e.message);
  }
}
seedPantryIfEmpty();

// Helper: Seed Default Users (Customer Arjun & Merchant Sri Lakshmi)
function seedUsersIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO users (id, name, email, phone, password, role, store_name, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('user_arjun', 'Arjun Sharma', 'arjun@example.com', '9876543210', '123456', 'customer', 'Sri Lakshmi Stores', '123/A, Green Valley Apartments, Bangalore');
      insert.run('user_merchant_04', 'Ramesh Patel', 'merchant@srilakshmi.in', 'MERCH-04', '0000', 'merchant', 'Sri Lakshmi Stores', 'Shop #4, Main Bazaar, Bangalore');
      console.log('[DB] Seeded default users into SQLite (Customer Arjun & Merchant Ramesh).');
    }
  } catch (e) {
    console.warn('[DB] seedUsersIfEmpty error:', e.message);
  }
}
seedUsersIfEmpty();

// Helper: Seed Default Products
function seedProductsIfEmpty(initialProducts) {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0 && initialProducts && initialProducts.length > 0) {
    const insert = db.prepare(`
      INSERT INTO products (id, name, brand, description, price, stock, daily_velocity, depletion_runway, demand_trend, category, tags, image_url)
      VALUES (@id, @name, @brand, @description, @price, @stock, @daily_velocity, @depletion_runway, @demand_trend, @category, @tags, @image_url)
    `);

    const insertMany = db.transaction((prods) => {
      for (const p of prods) {
        insert.run(p);
      }
    });

    insertMany(initialProducts);
    console.log(`[DB] Seeded ${initialProducts.length} default products into SQLite.`);
  }
}

// Helper: Seed Ecosystem Sections
function seedEcosystemIfEmpty(seeds) {
  const getStmt = db.prepare('SELECT section FROM ecosystem_data WHERE section = ?');
  const insertStmt = db.prepare('INSERT OR REPLACE INTO ecosystem_data (section, data_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');

  const tx = db.transaction((seedDict) => {
    for (const [section, data] of Object.entries(seedDict)) {
      const existing = getStmt.get(section);
      if (!existing) {
        insertStmt.run(section, JSON.stringify(data));
      }
    }
  });

  tx(seeds);
}

// DAO Methods
const dao = {
  // Products
  getAllProducts() {
    return db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  },

  getProductById(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },

  addProduct(product) {
    const id = product.id || 'prod_' + Date.now();
    const stmt = db.prepare(`
      INSERT INTO products (id, name, brand, description, price, stock, daily_velocity, depletion_runway, demand_trend, category, tags, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      product.name,
      product.brand || 'Local Kirana',
      product.description || 'Fresh neighborhood grocery product.',
      parseFloat(product.price) || 0,
      parseInt(product.stock) || 10,
      parseFloat(product.daily_velocity) || 5,
      product.depletion_runway || '3.5 days remaining',
      product.demand_trend || 'NEW',
      product.category || 'General',
      product.tags || 'Available',
      product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'
    );
    return dao.getProductById(id);
  },

  updateStock(productId, changeQty, reason = 'Order placed') {
    const prod = dao.getProductById(productId);
    if (!prod) return null;
    const newStock = Math.max(0, prod.stock + changeQty);
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, productId);
    db.prepare(`
      INSERT INTO inventory_logs (product_id, change_qty, remaining_stock, reason)
      VALUES (?, ?, ?, ?)
    `).run(productId, changeQty, newStock, reason);
    return newStock;
  },

  // Orders
  getAllOrders() {
    const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return rows.map(r => ({
      ...r,
      items: JSON.parse(r.items || '[]')
    }));
  },

  getOrderById(id) {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      items: JSON.parse(row.items || '[]')
    };
  },

  createOrder(orderData) {
    const id = orderData.id || 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const itemsJson = typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []);

    const stmt = db.prepare(`
      INSERT INTO orders (id, user_id, customer_name, items, total_amount, payment_method, delivery_address, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      orderData.user_id || 'arjun_01',
      orderData.customer_name || 'Arjun',
      itemsJson,
      parseFloat(orderData.total_amount) || 0,
      orderData.payment_method || 'UPI / QR',
      orderData.delivery_address || '123/A, Green Valley Apartments, Bangalore',
      'Confirmed'
    );

    // Auto-update stock for ordered items
    const parsedItems = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : (orderData.items || []);
    for (const item of parsedItems) {
      if (item.id) {
        dao.updateStock(item.id, -(item.quantity || 1), `Order ${id}`);
      }
    }

    return {
      id,
      status: 'Confirmed',
      items: parsedItems,
      total_amount: orderData.total_amount
    };
  },

  // Ecosystem Data (15 Sections)
  getSection(section) {
    const row = db.prepare('SELECT data_json FROM ecosystem_data WHERE section = ?').get(section);
    if (row && row.data_json) {
      try {
        return JSON.parse(row.data_json);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  setSection(section, data) {
    db.prepare('INSERT OR REPLACE INTO ecosystem_data (section, data_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(section, JSON.stringify(data));
  },

  // Users DAO Methods
  getAllUsers() {
    return db.prepare('SELECT id, name, email, phone, role, store_name, address, created_at FROM users ORDER BY created_at DESC').all();
  },

  getUserById(id) {
    return db.prepare('SELECT id, name, email, phone, role, store_name, address, created_at FROM users WHERE id = ?').get(id);
  },

  findUser(identifier) {
    return db.prepare('SELECT * FROM users WHERE phone = ? OR email = ? OR id = ?').get(identifier, identifier, identifier);
  },

  registerUser(userData) {
    const id = userData.id || ('usr_' + Date.now());
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, phone, password, role, store_name, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userData.name,
      userData.email || null,
      userData.phone || null,
      userData.password || '123456',
      userData.role || 'customer',
      userData.store_name || 'Sri Lakshmi Stores',
      userData.address || ''
    );
    return dao.getUserById(id);
  },

  // ========================================================
  // CUSTOMER PANTRY INVENTORY & CONSUMPTION DAO METHODS
  // ========================================================

  _formatPantryRow(row) {
    if (!row) return null;
    return {
      ...row,
      product_name: row.name,
      unit: row.display_unit,
      original_quantity: row.purchased_qty,
      original_quantity_base: row.base_purchased_qty,
      used_quantity_base: Math.max(0, row.base_purchased_qty - row.current_stock_base)
    };
  },

  getPantryItems(userId) {
    if (!userId) return [];
    const rows = db.prepare('SELECT * FROM pantry_items WHERE user_id = ? ORDER BY current_stock_base ASC').all(userId);
    return rows.map(r => dao._formatPantryRow(r));
  },

  getPantryItemById(id, userId) {
    const row = db.prepare('SELECT * FROM pantry_items WHERE id = ? AND user_id = ?').get(id, userId);
    return dao._formatPantryRow(row);
  },

  addPantryItem(item) {
    const id = item.id || ('pantry_' + Date.now());
    const name = item.name || item.product_name;
    const category = item.category || 'Food & Grains';
    const unitType = item.unit_type || 'weight';
    const displayUnit = item.display_unit || item.unit || 'kg';
    const pQty = item.purchased_qty !== undefined ? parseFloat(item.purchased_qty) : (parseFloat(item.original_quantity) || 1);
    const basePQty = item.base_purchased_qty !== undefined ? parseFloat(item.base_purchased_qty) : (parseFloat(item.original_quantity_base) || pQty);
    const baseUnit = item.base_unit || (displayUnit === 'L' || displayUnit === 'ml' ? 'ml' : (displayUnit === 'pcs' ? 'pcs' : 'g'));
    const curStock = item.current_stock_base !== undefined ? Math.max(0, parseFloat(item.current_stock_base)) : basePQty;
    const purchaseDate = item.purchase_date || new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO pantry_items (
        id, user_id, name, category, unit_type, display_unit, purchased_qty, base_purchased_qty,
        base_unit, purchase_date, last_updated_date, expiry_date, daily_usage_base, daily_usage_display,
        daily_usage_unit, low_stock_threshold_base, low_stock_threshold_display, low_stock_threshold_unit,
        manual_usage_total_base, current_stock_base, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      item.user_id || 'user_arjun',
      name,
      category,
      unitType,
      displayUnit,
      pQty,
      basePQty,
      baseUnit,
      purchaseDate,
      item.last_updated_date || purchaseDate,
      item.expiry_date || null,
      parseFloat(item.daily_usage_base) || 0,
      parseFloat(item.daily_usage_display) || 0,
      item.daily_usage_unit || baseUnit,
      parseFloat(item.low_stock_threshold_base) || 0,
      parseFloat(item.low_stock_threshold_display) || 0,
      item.low_stock_threshold_unit || baseUnit,
      parseFloat(item.manual_usage_total_base) || parseFloat(item.used_quantity_base) || 0,
      curStock,
      item.notes || ''
    );

    return dao.getPantryItemById(id, item.user_id || 'user_arjun');
  },

  updatePantryItem(id, userId, updates) {
    const existing = dao.getPantryItemById(id, userId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };

    db.prepare(`
      UPDATE pantry_items SET
        name = ?,
        category = ?,
        unit_type = ?,
        display_unit = ?,
        purchased_qty = ?,
        base_purchased_qty = ?,
        base_unit = ?,
        purchase_date = ?,
        last_updated_date = ?,
        expiry_date = ?,
        daily_usage_base = ?,
        daily_usage_display = ?,
        daily_usage_unit = ?,
        low_stock_threshold_base = ?,
        low_stock_threshold_display = ?,
        low_stock_threshold_unit = ?,
        manual_usage_total_base = ?,
        current_stock_base = ?,
        notes = ?
      WHERE id = ? AND user_id = ?
    `).run(
      merged.name,
      merged.category,
      merged.unit_type,
      merged.display_unit,
      parseFloat(merged.purchased_qty) || 0,
      parseFloat(merged.base_purchased_qty) || 0,
      merged.base_unit,
      merged.purchase_date,
      merged.last_updated_date,
      merged.expiry_date || null,
      parseFloat(merged.daily_usage_base) || 0,
      parseFloat(merged.daily_usage_display) || 0,
      merged.daily_usage_unit,
      parseFloat(merged.low_stock_threshold_base) || 0,
      parseFloat(merged.low_stock_threshold_display) || 0,
      merged.low_stock_threshold_unit,
      parseFloat(merged.manual_usage_total_base) || 0,
      Math.max(0, parseFloat(merged.current_stock_base) || 0),
      merged.notes || '',
      id,
      userId
    );

    return dao.getPantryItemById(id, userId);
  },

  deletePantryItem(id, userId) {
    const res = db.prepare('DELETE FROM pantry_items WHERE id = ? AND user_id = ?').run(id, userId);
    return res.changes > 0;
  },

  recordPantryUsage(id, userId, usedBase, date) {
    const existing = dao.getPantryItemById(id, userId);
    if (!existing) return null;

    const used = parseFloat(usedBase) || 0;
    const newStock = Math.max(0, (existing.current_stock_base || 0) - used);
    const newManualUsage = (existing.manual_usage_total_base || 0) + used;
    const updateDate = date || new Date().toISOString().split('T')[0];

    db.prepare(`
      UPDATE pantry_items SET
        current_stock_base = ?,
        manual_usage_total_base = ?,
        last_updated_date = ?
      WHERE id = ? AND user_id = ?
    `).run(newStock, newManualUsage, updateDate, id, userId);

    return dao.getPantryItemById(id, userId);
  },

  // System Stats
  getStats() {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const pantryCount = db.prepare('SELECT COUNT(*) as count FROM pantry_items').get().count;
    const logCount = db.prepare('SELECT COUNT(*) as count FROM inventory_logs').get().count;
    const sectionCount = db.prepare('SELECT COUNT(*) as count FROM ecosystem_data').get().count;

    let fileSize = 0;
    try {
      const stats = fs.statSync(DB_PATH);
      fileSize = stats.size;
    } catch (e) {}

    return {
      database: 'SQLite',
      file: 'grocify.db',
      filePath: DB_PATH,
      fileSizeBytes: fileSize,
      fileSizeKB: Math.round(fileSize / 1024),
      tables: {
        products: productCount,
        orders: orderCount,
        users: userCount,
        pantry_items: pantryCount,
        inventory_logs: logCount,
        ecosystem_sections: sectionCount
      },
      status: 'Online & Connected'
    };
  },

  seedPantryIfEmpty,
  seedUsersIfEmpty,
  seedProductsIfEmpty,
  seedEcosystemIfEmpty,
  db
};

module.exports = dao;
