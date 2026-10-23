const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'grocify.db');

// Connect to SQLite Database
const db = new Database(DB_PATH, { verbose: null });

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

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
  `);
}

initSchema();

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

  // System Stats
  getStats() {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
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
        inventory_logs: logCount,
        ecosystem_sections: sectionCount
      },
      status: 'Online & Connected'
    };
  },

  seedProductsIfEmpty,
  seedEcosystemIfEmpty,
  db
};

module.exports = dao;
