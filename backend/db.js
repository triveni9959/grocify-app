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

    -- Customer Smart Shopping List Table
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Grocery',
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      expected_date TEXT,
      budget REAL,
      estimated_price REAL,
      estimated_shop TEXT,
      is_user_price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      pantry_item_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customer Grocery Purchase History Table
    CREATE TABLE IF NOT EXISTS shopping_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      shopping_item_id TEXT,
      product_name TEXT NOT NULL,
      category TEXT DEFAULT 'Grocery',
      purchased_qty REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      shop_name TEXT,
      purchase_date TEXT NOT NULL,
      expiry_date TEXT,
      pantry_updated INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customer Shopping Budget Table
    CREATE TABLE IF NOT EXISTS customer_budgets (
      user_id TEXT PRIMARY KEY,
      shopping_budget REAL DEFAULT 1000,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Local Neighborhood Market Prices (Across Kirana stores)
    CREATE TABLE IF NOT EXISTS market_prices (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      brand TEXT,
      shop_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'kg',
      normalized_unit TEXT NOT NULL DEFAULT 'kg',
      normalized_price REAL NOT NULL,
      in_stock INTEGER DEFAULT 1,
      category TEXT DEFAULT 'Groceries',
      is_promotional INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initSchema();

// Helper: Seed Default Pantry Items for demo customer (user_arjun)
function seedPantryIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM pantry_items').get().count;
    if (count < 8) {
      // Clear older minimal seed if any to ensure complete day-by-day dataset
      db.prepare("DELETE FROM pantry_items WHERE id LIKE 'pantry_seed_%' OR id LIKE 'pantry_rice_%' OR id LIKE 'pantry_dal_%' OR id LIKE 'pantry_oil_%' OR id LIKE 'pantry_milk_%'").run();

      const today = new Date();
      today.setHours(0,0,0,0);
      const getRelDate = (offset) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split('T')[0];
      };

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

      // 1. Basmati Rice (Added 6 days ago)
      insert.run(
        'pantry_seed_1', 'user_arjun', 'Basmati Rice (Royal Supreme)', 'Food & Grains', 'weight', 'kg', 5, 5000,
        'g', getRelDate(-6), getRelDate(0), null, 150, 150,
        'g', 500, 500, 'g', 0, 4100, 'Daawat Rozana Premium Basmati'
      );

      // 2. Toor Dal (Added 5 days ago - Low Stock Alert)
      insert.run(
        'pantry_seed_2', 'user_arjun', 'Toor Dal (Organic Unpolished)', 'Dal & Pulses', 'weight', 'kg', 2, 2000,
        'g', getRelDate(-5), getRelDate(0), getRelDate(180), 80, 80,
        'g', 300, 300, 'g', 0, 200, 'Daily protein staple'
      );

      // 3. Whole Wheat Atta (Added 4 days ago)
      insert.run(
        'pantry_seed_3', 'user_arjun', 'Chakki Fresh Whole Wheat Atta', 'Food & Grains', 'weight', 'kg', 5, 5000,
        'g', getRelDate(-4), getRelDate(0), getRelDate(90), 200, 200,
        'g', 800, 800, 'g', 0, 4200, 'Aashirvaad 100% Sharbati Atta'
      );

      // 4. Sunflower Cooking Oil (Added 3 days ago - Expiring in 4 days)
      insert.run(
        'pantry_seed_4', 'user_arjun', 'Sunflower Cooking Oil', 'Cooking Oils & Ghee', 'volume', 'L', 2, 2000,
        'ml', getRelDate(-3), getRelDate(0), getRelDate(4), 60, 60,
        'ml', 250, 250, 'ml', 0, 850, 'Cold-pressed sunflower oil'
      );

      // 5. Pure Cow Ghee (Added 3 days ago)
      insert.run(
        'pantry_seed_5', 'user_arjun', 'Pure Desi Cow Ghee', 'Cooking Oils & Ghee', 'volume', 'L', 1, 1000,
        'ml', getRelDate(-3), getRelDate(0), getRelDate(120), 20, 20,
        'ml', 150, 150, 'ml', 0, 940, 'Amul pure cow ghee tin'
      );

      // 6. Farmhouse Fresh Milk (Added 2 days ago - Expiring in 2 days)
      insert.run(
        'pantry_seed_6', 'user_arjun', 'Farmhouse Fresh Milk', 'Dairy & Eggs', 'volume', 'L', 1, 1000,
        'ml', getRelDate(-2), getRelDate(0), getRelDate(2), 200, 200,
        'ml', 300, 300, 'ml', 0, 350, 'Morning pasteurised toned milk'
      );

      // 7. Organic Free-Range Eggs (Added 2 days ago)
      insert.run(
        'pantry_seed_7', 'user_arjun', 'Organic Free-Range Eggs', 'Dairy & Eggs', 'unit', 'pcs', 12, 12,
        'pcs', getRelDate(-2), getRelDate(0), getRelDate(14), 2, 2,
        'pcs', 4, 4, 'pcs', 0, 8, 'Farm fresh brown eggs crate'
      );

      // 8. Taj Mahal Premium Tea (Added yesterday)
      insert.run(
        'pantry_seed_8', 'user_arjun', 'Taj Mahal Premium Tea Leaves', 'Beverages & Snacks', 'weight', 'g', 500, 500,
        'g', getRelDate(-1), getRelDate(0), getRelDate(240), 15, 15,
        'g', 50, 50, 'g', 0, 485, 'Brooke Bond Taj Mahal Tea'
      );

      // 9. Tata Crystal Salt (Added today)
      insert.run(
        'pantry_seed_9', 'user_arjun', 'Tata Crystal Salt (Sendha Namak)', 'Spices & Condiments', 'weight', 'kg', 1, 1000,
        'g', getRelDate(0), getRelDate(0), null, 10, 10,
        'g', 150, 150, 'g', 0, 990, 'Vacuum evaporated iodized salt'
      );

      // 10. Dettol Herbal Bath Soap (Added today)
      insert.run(
        'pantry_seed_10', 'user_arjun', 'Dettol Herbal Bath Soap', 'Personal Care', 'unit', 'pcs', 4, 4,
        'pcs', getRelDate(0), getRelDate(0), null, 0.1, 0.1,
        'pcs', 1, 1, 'pcs', 0, 4, 'Antibacterial germ defense pack'
      );

      console.log('[DB] Seeded comprehensive day-by-day household pantry inventory into SQLite.');
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

// Canonical Grocery Name Normalizer
function getCanonicalGroceryName(name) {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('rice') || lower.includes('basmati')) return 'rice';
  if (lower.includes('toor dal') || lower.includes('tur dal') || lower.includes('arhar')) return 'toor dal';
  if (lower.includes('moong dal') || lower.includes('mung')) return 'moong dal';
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil')) return 'dal';
  if (lower.includes('sunflower') || lower.includes('cooking oil') || lower.includes('refined oil')) return 'sunflower oil';
  if (lower.includes('ghee')) return 'ghee';
  if (lower.includes('oil')) return 'oil';
  if (lower.includes('atta') || lower.includes('wheat') || lower.includes('flour')) return 'atta';
  if (lower.includes('milk')) return 'milk';
  if (lower.includes('egg')) return 'eggs';
  if (lower.includes('tomato')) return 'tomato';
  if (lower.includes('onion')) return 'onion';
  if (lower.includes('potato') || lower.includes('aloo')) return 'potato';
  if (lower.includes('soap') || lower.includes('dettol') || lower.includes('bath')) return 'soap';
  if (lower.includes('detergent') || lower.includes('surf') || lower.includes('powder') || lower.includes('wash')) return 'detergent';
  if (lower.includes('tea') || lower.includes('chai')) return 'tea';
  if (lower.includes('salt') || lower.includes('namak')) return 'salt';
  return lower.trim();
}

// Helper: Seed Market Prices across 4 neighborhood shops
function seedMarketPricesIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM market_prices').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO market_prices (id, product_name, canonical_name, brand, shop_name, price, quantity, unit, normalized_unit, normalized_price, in_stock, category)
        VALUES (@id, @product_name, @canonical_name, @brand, @shop_name, @price, @quantity, @unit, @normalized_unit, @normalized_price, @in_stock, @category)
      `);

      const defaultPrices = [
        // Basmati Rice
        { id: 'mp_rice_1', product_name: 'Basmati Rice (Royal Supreme)', canonical_name: 'rice', brand: 'Daawat Rozana', shop_name: 'Sri Lakshmi Stores', price: 95, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 95, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_rice_2', product_name: 'Royal Basmati Rice (1kg)', canonical_name: 'rice', brand: 'Fortune Heritage', shop_name: 'Ganesh Provisions', price: 102, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 102, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_rice_3', product_name: 'India Gate Feast Rozana Basmati', canonical_name: 'rice', brand: 'India Gate', shop_name: 'Kavitha Supermarket', price: 115, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 115, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_rice_4', product_name: 'Kohinoor Charminar Basmati Rice', canonical_name: 'rice', brand: 'Kohinoor', shop_name: 'Balaji Daily Fresh', price: 98, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 98, in_stock: 1, category: 'Food & Grains' },

        // Sona Masoori Rice (Affordable Alternative)
        { id: 'mp_alt_rice_1', product_name: 'Sona Masoori Raw Rice (1kg)', canonical_name: 'rice', brand: 'Fresh Kirana', shop_name: 'Ganesh Provisions', price: 58, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 58, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_alt_rice_2', product_name: 'Desi Sona Masoori Rice (1kg)', canonical_name: 'rice', brand: 'Local Farm', shop_name: 'Sri Lakshmi Stores', price: 62, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 62, in_stock: 1, category: 'Food & Grains' },

        // Toor Dal
        { id: 'mp_dal_1', product_name: 'Toor Dal (Organic Unpolished)', canonical_name: 'toor dal', brand: 'Organic Tattva', shop_name: 'Sri Lakshmi Stores', price: 145, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 145, in_stock: 1, category: 'Dal & Pulses' },
        { id: 'mp_dal_2', product_name: 'Regular Toor Dal (Polished)', canonical_name: 'toor dal', brand: 'Safe Harvest', shop_name: 'Ganesh Provisions', price: 152, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 152, in_stock: 1, category: 'Dal & Pulses' },
        { id: 'mp_dal_3', product_name: 'Tata Sampann Unpolished Toor Dal', canonical_name: 'toor dal', brand: 'Tata Sampann', shop_name: 'Kavitha Supermarket', price: 160, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 160, in_stock: 1, category: 'Dal & Pulses' },
        { id: 'mp_dal_4', product_name: 'Desi Unpolished Toor Dal', canonical_name: 'toor dal', brand: 'Desi Fresh', shop_name: 'Balaji Daily Fresh', price: 140, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 140, in_stock: 1, category: 'Dal & Pulses' },

        // Moong Dal
        { id: 'mp_moong_1', product_name: 'Yellow Moong Dal Split (1kg)', canonical_name: 'moong dal', brand: 'Local Co-op', shop_name: 'Sri Lakshmi Stores', price: 130, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 130, in_stock: 1, category: 'Dal & Pulses' },
        { id: 'mp_moong_2', product_name: 'Tata Sampann Moong Dal (1kg)', canonical_name: 'moong dal', brand: 'Tata Sampann', shop_name: 'Ganesh Provisions', price: 128, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 128, in_stock: 1, category: 'Dal & Pulses' },
        { id: 'mp_moong_3', product_name: 'Desi Moong Dal (1kg)', canonical_name: 'moong dal', brand: 'Balaji Select', shop_name: 'Balaji Daily Fresh', price: 132, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 132, in_stock: 1, category: 'Dal & Pulses' },

        // Sunflower Cooking Oil
        { id: 'mp_oil_1', product_name: 'Sunflower Cooking Oil (1L)', canonical_name: 'sunflower oil', brand: 'Fortune', shop_name: 'Sri Lakshmi Stores', price: 135, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 135, in_stock: 1, category: 'Cooking Oils & Ghee' },
        { id: 'mp_oil_2', product_name: 'Gemini Pure Sunflower Oil (1L)', canonical_name: 'sunflower oil', brand: 'Gemini', shop_name: 'Ganesh Provisions', price: 140, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 140, in_stock: 1, category: 'Cooking Oils & Ghee' },
        { id: 'mp_oil_3', product_name: 'Gold Winner Refined Sunflower Oil (1L)', canonical_name: 'sunflower oil', brand: 'Gold Winner', shop_name: 'Kavitha Supermarket', price: 138, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 138, in_stock: 1, category: 'Cooking Oils & Ghee' },
        { id: 'mp_oil_4', product_name: 'Dhara Refined Sunflower Oil (1L)', canonical_name: 'sunflower oil', brand: 'Dhara', shop_name: 'Balaji Daily Fresh', price: 132, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 132, in_stock: 1, category: 'Cooking Oils & Ghee' },

        // Pure Desi Cow Ghee
        { id: 'mp_ghee_1', product_name: 'Pure Desi Cow Ghee (1L)', canonical_name: 'ghee', brand: 'Amul', shop_name: 'Sri Lakshmi Stores', price: 620, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 620, in_stock: 1, category: 'Cooking Oils & Ghee' },
        { id: 'mp_ghee_2', product_name: 'Nandini Pure Cow Ghee (1L)', canonical_name: 'ghee', brand: 'Nandini', shop_name: 'Ganesh Provisions', price: 610, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 610, in_stock: 1, category: 'Cooking Oils & Ghee' },
        { id: 'mp_ghee_3', product_name: 'Aashirvaad Svasti Pure Ghee (1L)', canonical_name: 'ghee', brand: 'Aashirvaad', shop_name: 'Kavitha Supermarket', price: 640, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 640, in_stock: 1, category: 'Cooking Oils & Ghee' },

        // Whole Wheat Atta
        { id: 'mp_atta_1', product_name: 'Chakki Fresh Whole Wheat Atta (5kg)', canonical_name: 'atta', brand: 'Aashirvaad', shop_name: 'Sri Lakshmi Stores', price: 215, quantity: 5, unit: 'kg', normalized_unit: 'kg', normalized_price: 43, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_atta_2', product_name: 'Aashirvaad Sharbati Atta (5kg)', canonical_name: 'atta', brand: 'Aashirvaad', shop_name: 'Ganesh Provisions', price: 230, quantity: 5, unit: 'kg', normalized_unit: 'kg', normalized_price: 46, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_atta_3', product_name: 'Pillsbury Chakki Fresh Atta (5kg)', canonical_name: 'atta', brand: 'Pillsbury', shop_name: 'Kavitha Supermarket', price: 225, quantity: 5, unit: 'kg', normalized_unit: 'kg', normalized_price: 45, in_stock: 1, category: 'Food & Grains' },
        { id: 'mp_atta_4', product_name: 'Fortune Chakki Fresh Atta (5kg)', canonical_name: 'atta', brand: 'Fortune', shop_name: 'Balaji Daily Fresh', price: 210, quantity: 5, unit: 'kg', normalized_unit: 'kg', normalized_price: 42, in_stock: 1, category: 'Food & Grains' },

        // Fresh Milk
        { id: 'mp_milk_1', product_name: 'Farmhouse Fresh Milk (1L)', canonical_name: 'milk', brand: 'Fresh Co-op', shop_name: 'Sri Lakshmi Stores', price: 65, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 65, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_milk_2', product_name: 'Nandini Pasteurised Toned Milk (1L)', canonical_name: 'milk', brand: 'Nandini', shop_name: 'Ganesh Provisions', price: 44, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 44, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_milk_3', product_name: 'Amul Taaza Homogenised Milk (1L)', canonical_name: 'milk', brand: 'Amul', shop_name: 'Kavitha Supermarket', price: 56, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 56, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_milk_4', product_name: 'Mother Dairy Full Cream Milk (1L)', canonical_name: 'milk', brand: 'Mother Dairy', shop_name: 'Balaji Daily Fresh', price: 68, quantity: 1, unit: 'L', normalized_unit: 'L', normalized_price: 68, in_stock: 1, category: 'Dairy & Eggs' },

        // Eggs
        { id: 'mp_egg_1', product_name: 'Organic Free-Range Eggs (6pk)', canonical_name: 'eggs', brand: 'Pure Farm', shop_name: 'Sri Lakshmi Stores', price: 72, quantity: 6, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 12, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_egg_2', product_name: 'Farm Fresh Brown Eggs (6pk)', canonical_name: 'eggs', brand: 'Keggfarms', shop_name: 'Ganesh Provisions', price: 60, quantity: 6, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 10, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_egg_3', product_name: 'Regular Table White Eggs (6pk)', canonical_name: 'eggs', brand: 'Local Poultry', shop_name: 'Kavitha Supermarket', price: 48, quantity: 6, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 8, in_stock: 1, category: 'Dairy & Eggs' },
        { id: 'mp_egg_4', product_name: 'Country Free-Range Eggs (6pk)', canonical_name: 'eggs', brand: 'Balaji Farm', shop_name: 'Balaji Daily Fresh', price: 66, quantity: 6, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 11, in_stock: 1, category: 'Dairy & Eggs' },

        // Tomatoes
        { id: 'mp_tom_1', product_name: 'Fresh Country Tomatoes (1kg)', canonical_name: 'tomato', brand: 'Local Farm', shop_name: 'Sri Lakshmi Stores', price: 38, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 38, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_tom_2', product_name: 'Desi Field Tomatoes (1kg)', canonical_name: 'tomato', brand: 'Direct Mandi', shop_name: 'Ganesh Provisions', price: 42, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 42, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_tom_3', product_name: 'Farm Fresh Country Tomatoes (1kg)', canonical_name: 'tomato', brand: 'Green Earth', shop_name: 'Kavitha Supermarket', price: 40, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 40, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_tom_4', product_name: 'Fresh Ripe Country Tomatoes (1kg)', canonical_name: 'tomato', brand: 'Balaji Direct', shop_name: 'Balaji Daily Fresh', price: 34, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 34, in_stock: 1, category: 'Fresh Produce' },

        // Onions
        { id: 'mp_oni_1', product_name: 'Nasik Red Onions (1kg)', canonical_name: 'onion', brand: 'Nasik Mandi', shop_name: 'Sri Lakshmi Stores', price: 45, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 45, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_oni_2', product_name: 'Quality Red Onions (1kg)', canonical_name: 'onion', brand: 'Local Farm', shop_name: 'Ganesh Provisions', price: 48, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 48, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_oni_3', product_name: 'Fresh Onion (1kg)', canonical_name: 'onion', brand: 'Daily Fresh', shop_name: 'Balaji Daily Fresh', price: 40, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 40, in_stock: 1, category: 'Fresh Produce' },

        // Potatoes
        { id: 'mp_pot_1', product_name: 'Fresh Jyoti Potatoes (1kg)', canonical_name: 'potato', brand: 'Farm Pick', shop_name: 'Sri Lakshmi Stores', price: 30, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 30, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_pot_2', product_name: 'Hassan Potatoes (1kg)', canonical_name: 'potato', brand: 'Direct Co-op', shop_name: 'Ganesh Provisions', price: 34, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 34, in_stock: 1, category: 'Fresh Produce' },
        { id: 'mp_pot_3', product_name: 'Fresh Yellow Potatoes (1kg)', canonical_name: 'potato', brand: 'Balaji Produce', shop_name: 'Balaji Daily Fresh', price: 26, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 26, in_stock: 1, category: 'Fresh Produce' },

        // Bath Soap
        { id: 'mp_soap_1', product_name: 'Dettol Herbal Bath Soap (4pk)', canonical_name: 'soap', brand: 'Dettol', shop_name: 'Sri Lakshmi Stores', price: 140, quantity: 4, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 35, in_stock: 1, category: 'Personal Care' },
        { id: 'mp_soap_2', product_name: 'Dettol Original Soap (4pk)', canonical_name: 'soap', brand: 'Dettol', shop_name: 'Ganesh Provisions', price: 148, quantity: 4, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 37, in_stock: 1, category: 'Personal Care' },
        { id: 'mp_soap_3', product_name: 'Lifebuoy Total Germ Protection (4pk)', canonical_name: 'soap', brand: 'Lifebuoy', shop_name: 'Kavitha Supermarket', price: 115, quantity: 4, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 28.75, in_stock: 1, category: 'Personal Care' },
        { id: 'mp_soap_4', product_name: 'Dettol Neem Protection Soap (4pk)', canonical_name: 'soap', brand: 'Dettol', shop_name: 'Balaji Daily Fresh', price: 136, quantity: 4, unit: 'pcs', normalized_unit: 'pcs', normalized_price: 34, in_stock: 1, category: 'Personal Care' },

        // Detergent
        { id: 'mp_det_1', product_name: 'Surf Excel Matic Top Load Detergent (1kg)', canonical_name: 'detergent', brand: 'Surf Excel', shop_name: 'Sri Lakshmi Stores', price: 210, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 210, in_stock: 1, category: 'Household Care' },
        { id: 'mp_det_2', product_name: 'Ariel Matic Powder (1kg)', canonical_name: 'detergent', brand: 'Ariel', shop_name: 'Ganesh Provisions', price: 220, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 220, in_stock: 1, category: 'Household Care' },
        { id: 'mp_det_3', product_name: 'Surf Excel Easy Wash Detergent (1kg)', canonical_name: 'detergent', brand: 'Surf Excel', shop_name: 'Kavitha Supermarket', price: 155, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 155, in_stock: 1, category: 'Household Care' },
        { id: 'mp_det_4', product_name: 'Tide Plus Extra Power Detergent (1kg)', canonical_name: 'detergent', brand: 'Tide', shop_name: 'Balaji Daily Fresh', price: 130, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 130, in_stock: 1, category: 'Household Care' },

        // Tea
        { id: 'mp_tea_1', product_name: 'Taj Mahal Premium Tea Leaves (500g)', canonical_name: 'tea', brand: 'Taj Mahal', shop_name: 'Sri Lakshmi Stores', price: 295, quantity: 0.5, unit: 'kg', normalized_unit: 'kg', normalized_price: 590, in_stock: 1, category: 'Beverages & Snacks' },
        { id: 'mp_tea_2', product_name: 'Red Label Tea (500g)', canonical_name: 'tea', brand: 'Red Label', shop_name: 'Ganesh Provisions', price: 240, quantity: 0.5, unit: 'kg', normalized_unit: 'kg', normalized_price: 480, in_stock: 1, category: 'Beverages & Snacks' },
        { id: 'mp_tea_3', product_name: 'Tata Tea Gold (500g)', canonical_name: 'tea', brand: 'Tata Tea', shop_name: 'Balaji Daily Fresh', price: 260, quantity: 0.5, unit: 'kg', normalized_unit: 'kg', normalized_price: 520, in_stock: 1, category: 'Beverages & Snacks' },

        // Salt
        { id: 'mp_salt_1', product_name: 'Tata Crystal Salt (Sendha Namak 1kg)', canonical_name: 'salt', brand: 'Tata Salt', shop_name: 'Sri Lakshmi Stores', price: 28, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 28, in_stock: 1, category: 'Spices & Condiments' },
        { id: 'mp_salt_2', product_name: 'Tata Iodized Salt (1kg)', canonical_name: 'salt', brand: 'Tata Salt', shop_name: 'Ganesh Provisions', price: 26, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 26, in_stock: 1, category: 'Spices & Condiments' },
        { id: 'mp_salt_3', product_name: 'Aashirvaad Crystal Salt (1kg)', canonical_name: 'salt', brand: 'Aashirvaad', shop_name: 'Balaji Daily Fresh', price: 25, quantity: 1, unit: 'kg', normalized_unit: 'kg', normalized_price: 25, in_stock: 1, category: 'Spices & Condiments' }
      ];

      const insertMany = db.transaction((prices) => {
        for (const p of prices) {
          insert.run(p);
        }
      });
      insertMany(defaultPrices);
      console.log(`[DB] Seeded ${defaultPrices.length} grocery market price comparison records across 4 neighborhood stores.`);
    }
  } catch (e) {
    console.warn('[DB] seedMarketPricesIfEmpty error:', e.message);
  }
}
seedMarketPricesIfEmpty();

// Helper: Seed Default Shopping List for demo customer (user_arjun)
function seedShoppingListIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM shopping_list_items').get().count;
    if (count === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const insert = db.prepare(`
        INSERT INTO shopping_list_items (id, user_id, name, category, quantity, unit, expected_date, budget, estimated_price, estimated_shop, is_user_price, status, pantry_item_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run('shop_seed_1', 'user_arjun', 'Toor Dal (Organic Unpolished)', 'Dal & Pulses', 1, 'kg', todayStr, 150, 140, 'Balaji Daily Fresh', 0, 'pending', 'pantry_seed_2', 'Pantry stock running low (only 200g left)');
      insert.run('shop_seed_2', 'user_arjun', 'Farmhouse Fresh Milk', 'Dairy & Eggs', 2, 'L', todayStr, 140, 65, 'Sri Lakshmi Stores', 0, 'pending', 'pantry_seed_6', 'Daily morning milk supply refill');
      insert.run('shop_seed_3', 'user_arjun', 'Surf Excel Matic Top Load Detergent', 'Household Care', 1, 'kg', tomorrowStr, 220, 210, 'Sri Lakshmi Stores', 0, 'pending', null, 'Monthly laundry refill');
      insert.run('shop_seed_4', 'user_arjun', 'Dettol Herbal Bath Soap', 'Personal Care', 4, 'pcs', tomorrowStr, 150, 34, 'Balaji Daily Fresh', 0, 'pending', 'pantry_seed_10', 'Household bath hygiene soap pack');
      insert.run('shop_seed_5', 'user_arjun', 'Fresh Country Tomatoes', 'Fresh Produce', 2, 'kg', todayStr, 80, 34, 'Balaji Daily Fresh', 0, 'pending', null, 'Fresh curry cooking staple');

      console.log('[DB] Seeded 5 initial smart shopping list items for user_arjun.');
    }
  } catch (e) {
    console.warn('[DB] seedShoppingListIfEmpty error:', e.message);
  }
}
seedShoppingListIfEmpty();

// Helper: Seed Default Shopping Budget
function seedBudgetsIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM customer_budgets').get().count;
    if (count === 0) {
      db.prepare('INSERT INTO customer_budgets (user_id, shopping_budget, notes) VALUES (?, ?, ?)')
        .run('user_arjun', 1000, 'Monthly household grocery plan');
      console.log('[DB] Seeded default customer shopping budget (₹1,000 for user_arjun).');
    }
  } catch (e) {
    console.warn('[DB] seedBudgetsIfEmpty error:', e.message);
  }
}
seedBudgetsIfEmpty();

// Helper: Seed Default Purchase History
function seedPurchasesIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM shopping_purchases').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO shopping_purchases (id, user_id, shopping_item_id, product_name, category, purchased_qty, unit, unit_price, total_amount, shop_name, purchase_date, expiry_date, pantry_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run('pur_seed_1', 'user_arjun', null, 'Basmati Rice (Royal Supreme)', 'Food & Grains', 5, 'kg', 95, 475, 'Sri Lakshmi Stores', '2026-10-20', '2027-10-20', 1);
      insert.run('pur_seed_2', 'user_arjun', null, 'Chakki Fresh Whole Wheat Atta', 'Food & Grains', 5, 'kg', 43, 215, 'Sri Lakshmi Stores', '2026-10-22', '2027-01-24', 1);
      insert.run('pur_seed_3', 'user_arjun', null, 'Sunflower Cooking Oil', 'Cooking Oils & Ghee', 2, 'L', 135, 270, 'Sri Lakshmi Stores', '2026-10-23', '2026-10-30', 1);
      insert.run('pur_seed_4', 'user_arjun', null, 'Organic Free-Range Eggs', 'Dairy & Eggs', 12, 'pcs', 12, 144, 'Sri Lakshmi Stores', '2026-10-24', '2026-11-09', 1);

      console.log('[DB] Seeded initial grocery purchase history for user_arjun.');
    }
  } catch (e) {
    console.warn('[DB] seedPurchasesIfEmpty error:', e.message);
  }
}
seedPurchasesIfEmpty();

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

  // Day-by-Day Ingredients Addition Statistics for Customer Pantry
  getPantryDayByDayStats(userId, days = 7) {
    if (!userId) return [];
    const items = dao.getPantryItems(userId);
    const dayMap = {};
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateLabel = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      dayMap[dateStr] = {
        date: dateStr,
        dateLabel,
        isToday: i === 0,
        itemsAdded: 0,
        totalQtyBase: 0,
        items: []
      };
    }

    items.forEach(it => {
      const pDate = it.purchase_date || '';
      if (dayMap[pDate]) {
        dayMap[pDate].itemsAdded++;
        dayMap[pDate].totalQtyBase += (it.base_purchased_qty || it.original_quantity_base || 0);
        dayMap[pDate].items.push({
          id: it.id,
          name: it.name || it.product_name,
          category: it.category,
          unit: it.display_unit || it.unit,
          purchased_qty: it.purchased_qty || it.original_quantity,
          current_stock_base: it.current_stock_base
        });
      }
    });

    return Object.values(dayMap);
  },

  // ========================================================
  // SMART GROCERY SHOPPING LIST & PRICE COMPARISON DAO METHODS
  // ========================================================

  getCanonicalGroceryName,

  getShoppingItems(userId, status = null) {
    if (!userId) userId = 'user_arjun';
    let query = 'SELECT * FROM shopping_list_items WHERE user_id = ?';
    const params = [userId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += " ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, expected_date ASC, created_at DESC";
    const rows = db.prepare(query).all(...params);

    return rows.map(r => {
      let comparison = null;
      if (!r.is_user_price) {
        comparison = dao.comparePricesForProduct(r.name, r.quantity, r.unit);
      }
      const bestShop = comparison && comparison.recommendedShop ? comparison.recommendedShop.shopName : r.estimated_shop;
      const bestPrice = comparison && comparison.recommendedShop ? comparison.recommendedShop.unitPrice : r.estimated_price;
      const firstAlt = comparison && comparison.alternatives && comparison.alternatives.length > 0 ? {
        product_name: comparison.alternatives[0].productName,
        shop_name: comparison.alternatives[0].shopName,
        price: comparison.alternatives[0].unitPrice,
        unit: r.unit,
        savings: comparison.alternatives[0].savings
      } : null;

      return {
        ...r,
        product_name: r.name,
        required_quantity: r.quantity,
        item_budget: r.budget,
        suggested_price: bestPrice,
        suggested_shop: bestShop,
        affordable_alternative: firstAlt,
        user_entered_price: r.is_user_price ? r.estimated_price : null,
        comparison
      };
    });
  },

  getShoppingItemById(id, userId = null) {
    const row = userId
      ? db.prepare('SELECT * FROM shopping_list_items WHERE id = ? AND user_id = ?').get(id, userId)
      : db.prepare('SELECT * FROM shopping_list_items WHERE id = ?').get(id);
    if (!row) return null;
    let comparison = null;
    if (!row.is_user_price) {
      comparison = dao.comparePricesForProduct(row.name, row.quantity, row.unit);
    }
    const bestShop = comparison && comparison.recommendedShop ? comparison.recommendedShop.shopName : row.estimated_shop;
    const bestPrice = comparison && comparison.recommendedShop ? comparison.recommendedShop.unitPrice : row.estimated_price;
    const firstAlt = comparison && comparison.alternatives && comparison.alternatives.length > 0 ? {
      product_name: comparison.alternatives[0].productName,
      shop_name: comparison.alternatives[0].shopName,
      price: comparison.alternatives[0].unitPrice,
      unit: row.unit,
      savings: comparison.alternatives[0].savings
    } : null;

    return {
      ...row,
      product_name: row.name,
      required_quantity: row.quantity,
      item_budget: row.budget,
      suggested_price: bestPrice,
      suggested_shop: bestShop,
      affordable_alternative: firstAlt,
      user_entered_price: row.is_user_price ? row.estimated_price : null,
      comparison
    };
  },

  addShoppingItem(item) {
    const id = item.id || ('shop_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    const userId = item.user_id || 'user_arjun';
    const name = (item.name || item.product_name || '').trim();
    const category = item.category || 'Food & Grains';
    const quantity = Math.max(0.01, parseFloat(item.quantity !== undefined ? item.quantity : item.required_quantity) || 1);
    const unit = item.unit || 'kg';
    const expectedDate = item.expected_date || new Date().toISOString().split('T')[0];
    const rawBudget = item.budget !== undefined ? item.budget : item.item_budget;
    const budget = (rawBudget !== undefined && rawBudget !== null && rawBudget !== '') ? parseFloat(rawBudget) : null;
    const notes = item.notes || '';
    const pantryItemId = item.pantry_item_id || null;

    let isUserPrice = item.is_user_price ? 1 : 0;
    let estimatedPrice = item.estimated_price !== undefined ? parseFloat(item.estimated_price) : 0;
    let estimatedShop = item.estimated_shop || null;

    if (!isUserPrice) {
      const comp = dao.comparePricesForProduct(name, quantity, unit);
      if (comp.hasPriceData && comp.recommendedShop) {
        estimatedPrice = comp.recommendedShop.unitPrice;
        estimatedShop = comp.recommendedShop.shopName;
      } else if (item.user_entered_price !== undefined && item.user_entered_price !== null && item.user_entered_price !== '') {
        estimatedPrice = parseFloat(item.user_entered_price) || 0;
        isUserPrice = 1;
        estimatedShop = item.estimated_shop || 'User Specified';
      }
    }

    const stmt = db.prepare(`
      INSERT INTO shopping_list_items (
        id, user_id, name, category, quantity, unit, expected_date,
        budget, estimated_price, estimated_shop, is_user_price, status, pantry_item_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, userId, name, category, quantity, unit, expectedDate,
      budget, estimatedPrice, estimatedShop, isUserPrice, 'pending', pantryItemId, notes
    );

    return dao.getShoppingItemById(id, userId);
  },

  updateShoppingItem(id, userIdOrUpdates, possibleUpdates) {
    let userId = null;
    let updates = {};
    if (typeof userIdOrUpdates === 'object' && userIdOrUpdates !== null && !possibleUpdates) {
      updates = userIdOrUpdates;
      userId = updates.user_id || null;
    } else {
      userId = userIdOrUpdates || null;
      updates = possibleUpdates || {};
    }

    const existing = dao.getShoppingItemById(id, userId);
    if (!existing) return null;

    userId = userId || existing.user_id || 'user_arjun';

    const merged = { ...existing, ...updates };
    const quantity = Math.max(0.01, parseFloat(updates.required_quantity !== undefined ? updates.required_quantity : (merged.quantity || merged.required_quantity)) || 1);
    const unit = updates.unit || merged.unit || 'kg';
    const name = (updates.product_name !== undefined ? updates.product_name : (merged.name || merged.product_name || '')).trim();

    let isUserPrice = merged.is_user_price ? 1 : 0;
    let estimatedPrice = merged.estimated_price !== undefined ? parseFloat(merged.estimated_price) : 0;
    let estimatedShop = merged.estimated_shop || null;

    if (updates.is_user_price !== undefined) {
      isUserPrice = updates.is_user_price ? 1 : 0;
    }
    if (updates.user_entered_price !== undefined && updates.user_entered_price !== null && updates.user_entered_price !== '') {
      estimatedPrice = parseFloat(updates.user_entered_price) || 0;
      isUserPrice = 1;
      estimatedShop = updates.estimated_shop || 'User Specified';
    }

    if (!isUserPrice) {
      const comp = dao.comparePricesForProduct(name, quantity, unit);
      if (comp.hasPriceData && comp.recommendedShop) {
        estimatedPrice = comp.recommendedShop.unitPrice;
        estimatedShop = comp.recommendedShop.shopName;
      }
    }

    const rawBudget = updates.item_budget !== undefined ? updates.item_budget : (updates.budget !== undefined ? updates.budget : merged.budget);
    const budget = (rawBudget !== null && rawBudget !== undefined && rawBudget !== '') ? parseFloat(rawBudget) : null;

    db.prepare(`
      UPDATE shopping_list_items SET
        name = ?,
        category = ?,
        quantity = ?,
        unit = ?,
        expected_date = ?,
        budget = ?,
        estimated_price = ?,
        estimated_shop = ?,
        is_user_price = ?,
        status = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      merged.category,
      quantity,
      unit,
      merged.expected_date,
      budget,
      estimatedPrice,
      estimatedShop,
      isUserPrice,
      merged.status || 'pending',
      merged.notes || '',
      id,
      userId
    );

    return dao.getShoppingItemById(id, userId);
  },

  deleteShoppingItem(id, userId = null) {
    const res = userId
      ? db.prepare('DELETE FROM shopping_list_items WHERE id = ? AND user_id = ?').run(id, userId)
      : db.prepare('DELETE FROM shopping_list_items WHERE id = ?').run(id);
    return res.changes > 0;
  },

  // Market Prices & Multi-Store Price Comparison Engine
  getMarketPrices(query = '') {
    if (!query) {
      return db.prepare('SELECT * FROM market_prices ORDER BY canonical_name ASC, normalized_price ASC').all();
    }
    const clean = query.trim().toLowerCase();
    const canonical = getCanonicalGroceryName(clean);
    return db.prepare(`
      SELECT * FROM market_prices 
      WHERE canonical_name = ? OR canonical_name LIKE ? OR product_name LIKE ?
      ORDER BY normalized_price ASC
    `).all(canonical, `%${clean}%`, `%${clean}%`);
  },

  comparePricesForProduct(productName, quantity = 1, unit = 'kg') {
    if (!productName) return { hasPriceData: false, comparisons: [] };
    const clean = productName.trim().toLowerCase();
    const canonical = getCanonicalGroceryName(clean);
    
    // First attempt: match specific keywords if more specific than just canonical
    let rows = [];
    const specificWords = clean.split(/[\s,()\-]+/).filter(w => w.length >= 3 && w !== canonical && w !== 'organic' && w !== 'fresh');
    
    if (specificWords.length > 0) {
      // Try to find products that match the specific word (e.g. "basmati", "surf", "dettol", "toor", "chakki")
      const primaryWord = specificWords[0];
      rows = db.prepare(`
        SELECT * FROM market_prices 
        WHERE LOWER(product_name) LIKE ? OR LOWER(brand) LIKE ?
        ORDER BY normalized_price ASC
      `).all(`%${primaryWord}%`, `%${primaryWord}%`);
    }

    // If specific search didn't yield enough or any matches, broaden to canonical
    if (!rows || rows.length === 0) {
      rows = db.prepare(`
        SELECT * FROM market_prices 
        WHERE canonical_name = ? OR canonical_name LIKE ? OR LOWER(product_name) LIKE ?
        ORDER BY normalized_price ASC
      `).all(canonical, `%${canonical}%`, `%${clean}%`);
    }

    if (!rows || rows.length === 0) {
      return {
        hasPriceData: false,
        productName,
        canonicalName: canonical,
        comparisons: [],
        recommendedShop: null,
        alternatives: []
      };
    }

    const reqQty = parseFloat(quantity) || 1;
    const reqUnit = (unit || 'kg').toLowerCase();

    const getFactor = (userQty, userUnit, normUnit) => {
      const u = (userUnit || '').toLowerCase();
      const nu = (normUnit || '').toLowerCase();
      if (u === 'g' && nu === 'kg') return userQty / 1000;
      if (u === 'kg' && nu === 'kg') return userQty;
      if (u === 'ml' && nu === 'l') return userQty / 1000;
      if (u === 'l' && nu === 'l') return userQty;
      if (u === 'pcs' && nu === 'pcs') return userQty;
      return userQty;
    };

    const shopMap = {};
    rows.forEach(r => {
      const factor = getFactor(reqQty, reqUnit, r.normalized_unit);
      const estTotal = Math.round((r.normalized_price * factor) * 100) / 100;
      const unitPriceDisplay = `₹${r.normalized_price} / ${r.normalized_unit}`;

      if (!shopMap[r.shop_name] || estTotal < shopMap[r.shop_name].estimatedTotal) {
        shopMap[r.shop_name] = {
          shopName: r.shop_name,
          productName: r.product_name,
          brand: r.brand,
          unitPrice: r.normalized_price,
          unit: r.normalized_unit,
          unitPriceDisplay,
          estimatedTotal: estTotal,
          inStock: r.in_stock === 1,
          isLowest: false
        };
      }
    });

    const comparisons = Object.values(shopMap).sort((a, b) => a.estimatedTotal - b.estimatedTotal);
    if (comparisons.length > 0) {
      comparisons[0].isLowest = true;
    }

    const lowestOption = comparisons[0];
    const alternatives = [];
    if (lowestOption) {
      // Find cheaper alternative in same canonical or same category
      const matchedIds = rows.map(r => r.id);
      const placeholders = matchedIds.map(() => '?').join(',');
      const altRows = db.prepare(`
        SELECT * FROM market_prices 
        WHERE (canonical_name = ? OR category = (SELECT category FROM market_prices WHERE id = ? LIMIT 1))
          AND id NOT IN (${placeholders})
          AND normalized_price < ?
        ORDER BY normalized_price ASC LIMIT 2
      `).all(canonical, rows[0].id, ...matchedIds, lowestOption.unitPrice);

      altRows.forEach(alt => {
        const altFactor = getFactor(reqQty, reqUnit, alt.normalized_unit);
        const altTotal = Math.round((alt.normalized_price * altFactor) * 100) / 100;
        alternatives.push({
          productName: alt.product_name,
          shopName: alt.shop_name,
          brand: alt.brand,
          unitPrice: alt.normalized_price,
          unitPriceDisplay: `₹${alt.normalized_price} / ${alt.normalized_unit}`,
          estimatedTotal: altTotal,
          savings: Math.max(0, Math.round((lowestOption.estimatedTotal - altTotal) * 100) / 100)
        });
      });
    }

    const storesCompared = comparisons.map(c => ({
      shop_name: c.shopName,
      shopName: c.shopName,
      address: c.address,
      distance: c.distance,
      unit_price: c.unitPrice,
      unitPrice: c.unitPrice,
      unit: c.unit,
      estimated_total_cost: c.estimatedTotal,
      estimatedTotal: c.estimatedTotal,
      product_name: c.productName,
      productName: c.productName
    }));

    const recShop = comparisons.length > 0 ? {
      shop_name: comparisons[0].shopName,
      shopName: comparisons[0].shopName,
      address: comparisons[0].address,
      distance: comparisons[0].distance,
      unit_price: comparisons[0].unitPrice,
      unitPrice: comparisons[0].unitPrice,
      unit: comparisons[0].unit,
      estimated_total_cost: comparisons[0].estimatedTotal,
      estimatedTotal: comparisons[0].estimatedTotal,
      product_name: comparisons[0].productName,
      productName: comparisons[0].productName
    } : null;

    const affAlts = alternatives.map(a => ({
      product_name: a.productName,
      productName: a.productName,
      shop_name: a.shopName,
      shopName: a.shopName,
      price: a.unitPrice,
      unitPrice: a.unitPrice,
      unit: reqUnit,
      savings: a.savings
    }));

    return {
      hasPriceData: comparisons.length > 0,
      productName,
      canonicalName: canonical,
      comparisons,
      stores_compared: storesCompared,
      recommendedShop: recShop,
      recommended_shop: recShop,
      lowestPricePerUnit: comparisons.length > 0 ? comparisons[0].unitPrice : null,
      estimatedTotal: comparisons.length > 0 ? comparisons[0].estimatedTotal : null,
      alternatives,
      affordable_alternatives: affAlts
    };
  },

  // Customer Shopping Budget
  getCustomerBudget(userId) {
    if (!userId) userId = 'user_arjun';
    let row = db.prepare('SELECT * FROM customer_budgets WHERE user_id = ?').get(userId);
    if (!row) {
      db.prepare('INSERT OR IGNORE INTO customer_budgets (user_id, shopping_budget) VALUES (?, 1000)').run(userId);
      row = db.prepare('SELECT * FROM customer_budgets WHERE user_id = ?').get(userId);
    }
    const val = row ? row.shopping_budget : 1000;
    return {
      user_id: userId,
      total_budget: val,
      budget: val,
      shopping_budget: val
    };
  },

  setCustomerBudget(userId, budget) {
    if (!userId) userId = 'user_arjun';
    const val = Math.max(0, parseFloat(budget) || 1000);
    db.prepare(`
      INSERT INTO customer_budgets (user_id, shopping_budget, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET shopping_budget = excluded.shopping_budget, updated_at = CURRENT_TIMESTAMP
    `).run(userId, val);
    return val;
  },

  // Purchase Confirmation & Pantry Update
  recordPurchaseAndUpdatePantry(data) {
    const purchaseId = data.id || ('pur_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    const userId = data.user_id || 'user_arjun';
    const shoppingItemId = data.shopping_item_id || data.item_id || null;
    let productName = (data.product_name || data.name || '').trim();
    let category = data.category || 'Food & Grains';
    const purchasedQty = Math.max(0.01, parseFloat(data.purchased_qty || data.actual_quantity || data.quantity) || 1);
    const unit = data.unit || 'kg';
    const unitPrice = parseFloat(data.unit_price) || 0;
    const totalAmount = parseFloat(data.total_amount) || Math.round((purchasedQty * unitPrice) * 100) / 100;
    const shopName = data.shop_name || 'Sri Lakshmi Stores';
    const purchaseDate = data.purchase_date || new Date().toISOString().split('T')[0];
    const expiryDate = data.expiry_date || null;
    const updatePantry = data.update_pantry !== false;

    if (!productName && shoppingItemId) {
      const it = db.prepare('SELECT * FROM shopping_list_items WHERE id = ?').get(shoppingItemId);
      if (it) {
        productName = it.name;
        category = it.category;
      }
    }
    if (!productName) productName = 'Grocery Item';

    // 1. Record purchase history
    const stmt = db.prepare(`
      INSERT INTO shopping_purchases (
        id, user_id, shopping_item_id, product_name, category, purchased_qty,
        unit, unit_price, total_amount, shop_name, purchase_date, expiry_date, pantry_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      purchaseId, userId, shoppingItemId, productName, category,
      purchasedQty, unit, unitPrice, totalAmount, shopName, purchaseDate, expiryDate, updatePantry ? 1 : 0
    );

    // 2. Mark shopping list item as purchased if linked
    if (shoppingItemId) {
      db.prepare(`
        UPDATE shopping_list_items 
        SET status = 'purchased', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(shoppingItemId, userId);
    }

    // 3. Update My Pantry inventory if requested
    let pantryItem = null;
    if (updatePantry) {
      let existingPantry = null;
      if (data.pantry_item_id) {
        existingPantry = dao.getPantryItemById(data.pantry_item_id, userId);
      }
      if (!existingPantry) {
        const allPantry = dao.getPantryItems(userId);
        const canonReq = getCanonicalGroceryName(productName);
        existingPantry = allPantry.find(p => {
          const pName = (p.name || p.product_name || '').toLowerCase();
          const pCanon = getCanonicalGroceryName(pName);
          return pName === productName.toLowerCase() || (canonReq && pCanon === canonReq);
        });
      }

      const unitLower = unit.toLowerCase();
      let baseQty = purchasedQty;
      let baseUnit = 'g';
      let unitType = 'weight';

      if (unitLower === 'kg') {
        baseQty = purchasedQty * 1000;
        baseUnit = 'g';
        unitType = 'weight';
      } else if (unitLower === 'g') {
        baseQty = purchasedQty;
        baseUnit = 'g';
        unitType = 'weight';
      } else if (unitLower === 'l' || unitLower === 'litre' || unitLower === 'liter') {
        baseQty = purchasedQty * 1000;
        baseUnit = 'ml';
        unitType = 'volume';
      } else if (unitLower === 'ml') {
        baseQty = purchasedQty;
        baseUnit = 'ml';
        unitType = 'volume';
      } else {
        baseQty = purchasedQty;
        baseUnit = unit;
        unitType = 'unit';
      }

      if (existingPantry) {
        // Update existing pantry item
        const newStockBase = Math.round(((existingPantry.current_stock_base || 0) + baseQty) * 100) / 100;
        const newBasePurchased = Math.round(((existingPantry.base_purchased_qty || 0) + baseQty) * 100) / 100;
        const newPurchased = Math.round(((existingPantry.purchased_qty || 0) + purchasedQty) * 100) / 100;

        db.prepare(`
          UPDATE pantry_items SET
            current_stock_base = ?,
            base_purchased_qty = ?,
            purchased_qty = ?,
            last_updated_date = ?,
            expiry_date = COALESCE(?, expiry_date)
          WHERE id = ? AND user_id = ?
        `).run(newStockBase, newBasePurchased, newPurchased, purchaseDate, expiryDate, existingPantry.id, userId);

        pantryItem = dao.getPantryItemById(existingPantry.id, userId);
      } else {
        // Add new pantry item
        pantryItem = dao.addPantryItem({
          user_id: userId,
          name: productName,
          category: category,
          unit_type: unitType,
          display_unit: unit,
          purchased_qty: purchasedQty,
          base_purchased_qty: baseQty,
          base_unit: baseUnit,
          purchase_date: purchaseDate,
          expiry_date: expiryDate,
          current_stock_base: baseQty,
          low_stock_threshold_base: Math.round(baseQty * 0.2),
          low_stock_threshold_display: Math.round(purchasedQty * 0.2 * 10) / 10,
          low_stock_threshold_unit: unit,
          daily_usage_base: Math.round(baseQty / 14),
          daily_usage_display: Math.round((purchasedQty / 14) * 10) / 10,
          daily_usage_unit: unit,
          notes: `Purchased from ${shopName}`
        });
      }
    }

    const purchaseRecord = db.prepare('SELECT * FROM shopping_purchases WHERE id = ?').get(purchaseId);
    if (pantryItem && !pantryItem.product_name) pantryItem.product_name = pantryItem.name;
    return {
      success: true,
      purchase: purchaseRecord,
      pantryItem,
      pantry_item: pantryItem
    };
  },

  getPurchaseHistory(userId) {
    if (!userId) userId = 'user_arjun';
    return db.prepare('SELECT * FROM shopping_purchases WHERE user_id = ? ORDER BY purchase_date DESC, created_at DESC').all(userId);
  },

  // System Stats
  getStats() {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const pantryCount = db.prepare('SELECT COUNT(*) as count FROM pantry_items').get().count;
    const logCount = db.prepare('SELECT COUNT(*) as count FROM inventory_logs').get().count;
    const sectionCount = db.prepare('SELECT COUNT(*) as count FROM ecosystem_data').get().count;
    const shoppingCount = db.prepare('SELECT COUNT(*) as count FROM shopping_list_items').get().count;
    const marketPriceCount = db.prepare('SELECT COUNT(*) as count FROM market_prices').get().count;
    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM shopping_purchases').get().count;

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
        shopping_list_items: shoppingCount,
        market_prices: marketPriceCount,
        shopping_purchases: purchaseCount,
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
  seedMarketPricesIfEmpty,
  seedShoppingListIfEmpty,
  seedBudgetsIfEmpty,
  seedPurchasesIfEmpty,
  db
};

module.exports = dao;
