const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Mock Data
const customerData = {
  user: {
    name: "Arjun",
    store: "Sri Lakshmi Stores",
    distance: "0.8 km",
    status: "Active"
  },
  shoppingPattern: {
    product: "Milk",
    frequency: "every 6-7 days",
    daysLeft: 2,
    expectedRefillHours: 48,
    lastPurchased: "5 days ago",
    rhythm: "7-day regular"
  },
  usualProducts: [
    { id: 1, name: "Farmhouse Fresh Milk (1L)", emoji: "🥛", cycle: "7 days", status: "Available", stock: "high" },
    { id: 2, name: "Artisan Whole Wheat Bread", emoji: "🥐", cycle: "5 days", status: "Available", stock: "high" },
    { id: 3, name: "Organic Free-Range Eggs", emoji: "🥚", cycle: "9 days", status: "Only 4 cartons left", stock: "low" }
  ]
};

const patternData = {
  cadence: {
    days: 7,
    currentDay: 5,
    avgInterval: "6.8d",
    pantryInSync: "94%",
    peakBasket: "Wed"
  },
  routine: [
    { name: "Farmhouse Fresh Milk", emoji: "🥛", refillIn: "2 days", progress: 85, days: "5 / 7 Days", lastPurchased: "5 days ago", status: "14 consecutive cycles" },
    { name: "Artisan Whole Wheat Bread", emoji: "🥐", refillIn: "1 day", progress: 90, days: "4 / 4.5 Days", lastPurchased: "4 days ago", status: "Stable weekly cadence", color: "orange" },
    { name: "Organic Free-Range Eggs (6pk)", emoji: "🥚", refillIn: "5 days", progress: 40, days: "3 / 8 Days", lastPurchased: "3 days ago", status: "Low urgency", color: "gray" }
  ]
};

const productData = {
  id: "amul-milk-500",
  brand: "FRESH CO-OP DAIRY",
  name: "Amul Milk — 500 ml",
  description: "Daily household staple with 3.0% Fat & 8.5% SNF homogenized nutrition",
  price: 30,
  tags: ["Pasteurised Toned Milk", "2°C-4°C Chill"],
  meta: [
    { icon: "hash", label: "Batch #DL-882" },
    { icon: "map-pin", label: "Bay A-2 · Chilled Wall" },
    { icon: "sun", label: "Fresh Morning Supply" }
  ],
  availability: {
    demandTrend: "18%",
    currentStock: 24,
    dailyVelocity: 7,
    depletionRunway: "3.4 days remaining"
  },
  purchasePattern: {
    cycle: 14,
    days: 7,
    currentDay: 5,
    lastBought: "5 days ago",
    predicted: "~48h"
  }
};

const merchantData = {
  store: {
    name: "Grocify Node #04",
    location: "Greenfield Market • 428 L..."
  },
  pulse: {
    shelfIndex: 86,
    staples: 86,
    perishables: 92,
    coldChain: 79,
    inBuffer: { current: 142, total: 165 },
    stockOutliers: 0
  },
  metrics: [
    { name: "AVAILABILITY", value: "86%", label: "Optimal", desc: "Buffer across fresh...", progress: 86, color: "green" },
    { name: "DEMAND PACE", value: "74%", label: "↑+8%", desc: "Neighborhood...", progress: 74, color: "green" },
    { name: "EXPIRY RISK", value: "18%", label: "Safe", desc: "Low risk - 2 batches...", progress: 18, color: "orange" },
    { name: "EFFICIENCY", value: "91%", label: "Peak", desc: "Minimal surplus...", progress: 91, color: "green" }
  ],
  happeningToday: [
    { name: "Toned Milk (500ml)", tag: "Daily", stat: "↑+18%", statLabel: "Surge pace", statColor: "green", desc: "Daily velocity: 42 units / hr", icon: "🥛" },
    { name: "Whole Wheat Bread", tag: "Fresh", stat: "↑+11%", statLabel: "Morning run", statColor: "green", desc: "Active morning run - 18 reserved", icon: "🥐" },
    { name: "Organic Farm Eggs (6pk)", tag: "", stat: "→ Stable", statLabel: "On Target", statColor: "gray", desc: "Consistent rhythm - 6-day cyc...", icon: "🥚" },
    { name: "Crispy Corn Flakes 500g", tag: "", stat: "↘ -14%", statLabel: "Off-cycle", statColor: "gray", desc: "Off-cycle dip - Ample safe buffer", icon: "🥣" }
  ],
  attention: [
    {
      title: "3 products may need replenishment",
      badge: "< 4 Hours",
      desc: "Country Tomatoes, Amul Toned Milk 500ml, and Farmhouse Butter approaching safety buffer threshold.",
      actionPrimary: "Review Refill Plan →",
      actionSecondary: "Supplier dispatch ready",
      icon: "box"
    },
    {
      title: "2 products are approaching expiry",
      badge: "Expiring Soon",
      desc: "Artisan Sourdough (Batch #B12, in 18h) & Set Curd 500g (Batch #C04, in 24h).",
      actionPrimary: "Trigger Smart Offer",
      actionSecondary: "Recommended: -20% Flash clearance",
      icon: "hourglass"
    }
  ]
};

const calibrationData = {
  store: {
    name: "SRI LAKSHMI STORES",
    badge: "1.0x Signal Active"
  },
  step1: {
    title: "What do you usually buy?",
    desc: "Tap essentials your household relies on weekly.",
    selected: [
      { id: "milk", name: "Milk", icon: "check-circle" },
      { id: "bread", name: "Bread", icon: "check-circle" },
      { id: "eggs", name: "Eggs", icon: "check-circle" }
    ],
    unselected: [
      { id: "curd", name: "Curd", icon: "plus" },
      { id: "butter", name: "Butter", icon: "plus" },
      { id: "cereal", name: "Cereal", icon: "plus" },
      { id: "juice", name: "Juice", icon: "plus" },
      { id: "suggest", name: "Suggest item", icon: "list-plus" }
    ]
  },
  step2: {
    title: "How often do you buy them?",
    desc: "Calibrates incoming dairy & bakery deliveries for zero run-outs.",
    items: [
      {
        id: 1,
        name: "Whole Fresh Milk",
        desc: "Nandini Blue / Organic Pasteur",
        priority: "Priority 1",
        signal: "Predicts 1L reserve every Tuesday & Friday mornings",
        image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80"
      },
      {
        id: 2,
        name: "Artisan Daily Bread",
        desc: "Sandwich Brown & Multi-grain",
        priority: "Priority 2",
        signal: "Batched with Thursday 06:30 AM fresh bakery drop",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=100&q=80"
      },
      {
        id: 3,
        name: "Farm Fresh Eggs",
        desc: "Cage-free table eggs (Pack of 12)",
        priority: "Priority 3",
        signal: "Flags safe buffer when stock dips below 6 cartons",
        image: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=100&q=80"
      }
    ]
  },
  stats: {
    homes: "842",
    wasted: "0%",
    buffer: "100%"
  }
};

// API Endpoints
const discoverData = {
  inventoryInfo: {
    optimal: 142,
    low: 6,
    restock: "4:30 PM"
  },
  availableProducts: [
    { id: 1, name: "Farmhouse Fresh Milk", description: "Co-operative Dairy · 1L Glass Bottle", price: 68, stockStatus: "Well stocked (24 units)", stockColor: "green", location: "Shelf A-2", action: "Reserve", actionIcon: "shopping-cart", actionClass: "btn-primary", img: "🥛", metadata: "Velocity: 16/day · Next batch Thu 7 AM", metaIcon: "trending-up" },
    { id: 2, name: "Artisan Whole Wheat Bread", description: "Stoneground · Sliced Loaf 400g", price: 55, stockStatus: "Available (12 loaves fresh)", stockColor: "green", location: "Bakery Bay", action: "Add to basket", actionIcon: "plus", actionClass: "btn-secondary", img: "🥐", metadata: "Baked 4h ago · Household cadence", metaIcon: "clock" },
    { id: 3, name: "Organic Free-Range Eggs", description: "Pasture Raised · Pack of 6", price: 94, stockStatus: "Limited stock (Only 3 left)", stockColor: "orange", location: "", action: "Hold for pickup", actionIcon: "lock", actionClass: "btn-primary", customActionStyle: "background: #92400e;", img: "🥚", metadata: "Rapid run-out · Expiry in 4 days", metaIcon: "activity", badgeText: "3 left", highlightBg: "#fffbeb" },
    { id: 4, name: "Natural Set Curd / Dahi", description: "Probiotic Rich · 500g Tub", price: 42, stockStatus: "Restocking soon (In transit)", stockColor: "gray", location: "18 units slotted", action: "Notify", actionIcon: "bell", actionClass: "btn-secondary", img: "🥣", metadata: "Arrival today @ 4:30 PM (Co-op van)", metaIcon: "clock" }
  ],
  storeSignal: {
    velocitySurge: "+18% Velocity Surge",
    baseline: "4-wk Baseline",
    title: "Milk demand increased 18% this week.",
    description: "Driven by morning neighborhood orders. Sri Lakshmi Stores has auto-adjusted incoming dairy co-op orders to prevent stockouts while maintaining zero surplus spoilage.",
    forecast: "Zero stockout risk forecasted"
  }
};

app.get('/api/customer', (req, res) => {
  res.json(db.getSection('customer') || customerData);
});

app.get('/api/pattern', (req, res) => {
  res.json(db.getSection('pattern') || patternData);
});

app.get('/api/product', (req, res) => {
  res.json(db.getSection('product') || productData);
});

app.get('/api/discover', (req, res) => {
  res.json(db.getSection('discover') || discoverData);
});

app.get('/api/merchant', (req, res) => {
  res.json(db.getSection('merchant') || merchantData);
});

app.get('/api/calibration', (req, res) => {
  res.json(db.getSection('calibration') || calibrationData);
});

const shopkeeperData = {
  header: {
    storeName: "Sri Lakshmi Stores",
    node: "NODE-042 - Home",
    status: ["NODE #042 ACTIVE", "POS sync 3m ago", "165 SKUs Live"],
    greeting: "Good morning, Raj",
    subtitle: "StockSense Engine - Continuous Autonomous Telemetry"
  },
  health: {
    score: 82,
    total: 100,
    label: "OPTIMAL RANGE",
    trend: "±1.4% from peak",
    metrics: [
      { name: "Availability", value: "88%", status: "Safe", desc: "145/165 SKUs buffered", color: "green" },
      { name: "Demand Stability", value: "78%", status: "Calibrated", desc: "Cadence aligned high", color: "green" },
      { name: "Expiry Attrition", value: "24%", status: "Attention", desc: "2 batches flagged", color: "orange" },
      { name: "Turn Efficiency", value: "91%", status: "Top 5%", desc: "Sector lead decile", color: "green" }
    ]
  },
  priorities: [
    {
      id: "sku-dai-881",
      type: "URGENT STOCKOUT RISK",
      typeColor: "red",
      sku: "SKU #DAI-881",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80",
      name: "Milk",
      desc: "Fresh Farm Dairy - Pasteurized Toned 500...",
      alert: "Depletes by 16:30 today",
      stats: [
        { label: "Est. Demand", value: "49", unit: "units", sub: "14 regular homes" },
        { label: "Current Bay", value: "25", unit: "units", sub: "-24 unit gap", subColor: "red" },
        { label: "Dispatch Target", value: "+34", unit: "units", sub: "Buffer included", subColor: "green" }
      ],
      insight: "Surge expected from neighborhood morning recurring basket demand. Co-op daily dispatch cutoff closes in 45 mins.",
      footerIcon: "truck",
      footerText: "ETA: 13:15 Co-op Van",
      action: "Review & Reorder →",
      actionClass: "btn-primary"
    },
    {
      id: "batch-yg-042",
      type: "PERISHABLE EXPIRY RISK",
      typeColor: "orange",
      sku: "Batch #YG-042",
      image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=100&q=80",
      name: "Yogurt",
      desc: "Artisan Set Curd / Greek Strained 400g",
      alert: "Expires in 48 hours (Friday EOD)",
      stats: [
        { label: "Units At Risk", value: "40", unit: "units", sub: "₹3,200 exposure" },
        { label: "Dynamic Rec", value: "-20%", unit: "promo", sub: "Smart Flash", subColor: "green", valueColor: "green" },
        { label: "Recovery Rate", value: "94%", unit: "", sub: "In 38 hours", subColor: "green" }
      ],
      insight: "Bundle offer with morning granola or trigger push markdown to 38 verified repeat breakfast shoppers within 800m radius.",
      footerIcon: "trending-down",
      footerText: "Zero loss projection",
      action: "Create Offer (-20%)",
      actionClass: "btn-secondary",
      actionStyle: "background: #eef8f2; color: var(--primary-dark); font-weight: 600;"
    },
    {
      id: "bay-b2",
      type: "CAPITAL STAGNATION",
      typeColor: "gray",
      sku: "Bay B-2 · Endcap",
      image: "https://images.unsplash.com/photo-1521950311756-78eec3b6ce1e?auto=format&fit=crop&w=100&q=80",
      name: "Corn Flakes",
      desc: "Crispy Golden Whole Grain Flakes 500g",
      alert: "Velocity: 3 units sold in 30 days",
      alertColor: "gray",
      stats: [
        { label: "Run Rate", value: "0.1", unit: "/day", sub: "Dormant bay" },
        { label: "Bay Occupancy", value: "50", unit: "units", sub: "2.4m shelf" },
        { label: "Locked Capital", value: "₹7,500", unit: "", sub: "Non-productive" }
      ],
      insight: "Swap shelf placement with high-margin Artisanal Granola or activate across-category Breakfast Bundle with Milk at POS.",
      footerIcon: "arrow-left-right",
      footerText: "Aisle Reallocation",
      action: "View Plan",
      actionClass: "btn-secondary",
      actionStyle: "background: #eef8f2; color: var(--primary-dark); font-weight: 600;"
    }
  ],
  guard: {
    title: "STOCKSENSE AUTONOMOUS GUARD",
    desc: "Executing these 3 prioritized interventions will bring today's store health from 82 to 94 and prevent an estimated ₹10,700 in lost margin and waste.",
    confidence: "98.4%",
    action: "Authorize All (3) ✓"
  }
};

app.get('/api/shopkeeper', (req, res) => {
  res.json(db.getSection('shopkeeper') || shopkeeperData);
});

const inventoryIntelligenceData = {
  header: {
    storeName: "Sri Lakshmi Stores",
    node: "NODE-042 - Home",
    status: ["SRI LAKSHMI STORES - NODE #042"],
    telemetry: "Live Telemetry"
  },
  summary: {
    total: 165,
    needsAction: 8,
    healthy: 138,
    slow: 19,
    capital: "₹1,42,800",
    atRisk: 8
  },
  items: [
    {
      id: 1,
      name: "Pasteurized To...",
      desc: "Fresh Farm Dairy - 500ml pouch",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80",
      status: "Needs Reorder",
      statusColor: "red",
      stats: [
        { label: "Stock", value: "25", unit: "units" },
        { label: "Daily Demand", value: "7/d ↑", color: "red" },
        { label: "Runway", value: "3.6 days", color: "red" },
        { label: "Bay Location", value: "A-2 Cold" }
      ],
      barLabel: "Runway Buffer Status",
      barValue: "Depletes Friday 16:30",
      barColor: "red",
      barProgress: 20,
      accordionTitle: "Demand Signal Diagnosis",
      accordionIcon: "activity",
      accordionText: "Demand spiked <b>+18%</b> from morning co-op pre-orders. Runout projected Friday 16:30. Reorder 34 units before 11:00 AM dispatch cutoff to preserve 99.4% availability.",
      expanded: true,
      footerText: "Batch #MK-9021",
      actionText: "Reorder (+34) →",
      actionClass: "btn-primary"
    },
    {
      id: 2,
      name: "Artisan Set C...",
      desc: "Artisan Dairy - 400g tub",
      image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=100&q=80",
      status: "Near Expiry (48h)",
      statusColor: "orange",
      stats: [
        { label: "Stock", value: "40", unit: "units" },
        { label: "Velocity", value: "3/day", unit: "" },
        { label: "Runway", value: "13.3", unit: "days" },
        { label: "Expiry Window", value: "48h (Fri)" }
      ],
      barLabel: "At-Risk Capital",
      barIcon: "alert-triangle",
      barValue: "₹3,200 (34 units)",
      barColor: "orange",
      barProgress: 85,
      accordionTitle: "Why this action?",
      accordionIcon: "help-circle",
      accordionText: "Current velocity (3/day) leaves ~34 units unsold past expiry date. Recommend triggering a <b>-20% Smart Flash offer</b> or POS bundle with Granola to recover 94% margin.",
      expanded: true,
      footerText: "Batch #YG-042 - Bay C-1",
      actionIcon: "zap",
      actionText: "Create -20% Flash",
      actionClass: "btn-secondary",
      actionStyle: "background: #f97316; color: white; border: none; font-weight: 600;"
    },
    {
      id: 3,
      name: "Artisan Brown Loaf",
      desc: "Daily Bakery - 400g sliced",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=100&q=80",
      status: "Healthy",
      statusColor: "green",
      stats: [
        { label: "Stock", value: "42", unit: "units" },
        { label: "Daily Demand", value: "6/day" },
        { label: "Runway", value: "7.0", unit: "days", color: "green" },
        { label: "Bay", value: "B-1 Shelf" }
      ],
      barLabel: "Replenishment Cadence",
      barValue: "Optimal 100% sync",
      barColor: "green",
      barProgress: 100,
      accordionTitle: "Why this status?",
      accordionIcon: "check-circle",
      expanded: false,
      footerText: "Cadence: Daily Fresh",
      actionText: "View Cycle Details",
      actionClass: "btn-secondary"
    },
    {
      id: 4,
      name: "Crispy Golden Fl...",
      desc: "Whole Grain - 500g box",
      image: "https://images.unsplash.com/photo-1521950311756-78eec3b6ce1e?auto=format&fit=crop&w=100&q=80",
      status: "Slow Moving",
      statusColor: "gray",
      stats: [
        { label: "Stock", value: "50", unit: "units" },
        { label: "Daily Demand", value: "0.1/day" },
        { label: "Runway", value: "500", unit: "days" },
        { label: "Locked Cap.", value: "₹7,500" }
      ],
      accordionTitle: "Telemetry Insight",
      accordionIcon: "bar-chart-2",
      accordionText: "Velocity dropped to <b>3 units sold in 30 days</b>. Occupying 2.4m prime endcap display. Recommend aisle reallocation or bundling with morning milk.",
      expanded: true,
      footerText: "Display: Prime Endcap 2",
      actionIcon: "arrow-left-right",
      actionText: "Reallocate Shelf",
      actionClass: "btn-secondary"
    },
    {
      id: 5,
      name: "Cage-Free Table E...",
      desc: "Farm Fresh - Pack of 12",
      image: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=100&q=80",
      status: "Healthy",
      statusColor: "green",
      stats: [
        { label: "Stock", value: "18", unit: "packs" },
        { label: "Daily Demand", value: "4/day" },
        { label: "Runway", value: "4.5", unit: "days", color: "green" },
        { label: "Bay", value: "A-4 Shelf" }
      ],
      accordionTitle: "Cadence Insights",
      accordionIcon: "activity",
      expanded: false
    }
  ],
  floatingBanner: {
    queued: "8 Interventions Queued",
    revenue: "Est. Recovered Revenue: ₹10,700",
    action: "Execute Batch"
  }
};

app.get('/api/inventory', (req, res) => {
  res.json(inventoryIntelligenceData);
});

const decisionData = {
  header: {
    node: "Node #042",
    id: "#DAI-881"
  },
  product: {
    category: "DAIRY & COLD CHAIN · BAY A-2",
    risk: "Urgent Stockout Risk (Depletes in 3.6 days)",
    name: "Milk — 500 ml",
    price: "₹30",
    unit: "/ unit",
    costMargin: "Cost: ₹22.50 - Margin 25%",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80",
    tag: "Cold",
    health: { label: "Cold Chain Health", value: "3.4°C (Optimal)", color: "green", icon: "thermometer" },
    expiry: { label: "Shelf Expiry Window", value: "Batch B4 · 48h Safe", color: "red" }
  },
  metrics: [
    { title: "CURRENT STOCK", icon: "package", value: "25", unit: "units", sub: "Runway: 3.6 days -...", barColor: "red", barWidth: "30%" },
    { title: "DAILY DEMAND", icon: "trending-up", value: "7", unit: "/ day", sub: "↑ 18% vs 4-wk baselin...", subColor: "green", barColor: "green", barWidth: "75%" },
    { title: "STOCK COVERAGE", icon: "clock", value: "3.6", unit: "days", sub: "Critical zone < 4 days...", barColor: "red", barWidth: "35%" },
    { title: "STOCK VALUE", icon: "banknote", value: "₹750", unit: "liquid", sub: "Wholesale at-cost...", barColor: "green", barWidth: "60%" }
  ],
  chart: {
    title: "DEMAND TREND",
    tag: "Real-time Sync",
    subtitle: "Past demand → Forecast demand (30-day continuum)",
    tabs: ["Past 15 Days", "All 30 Days", "Forecast 15 Days"],
    activeTab: "All 30 Days",
    insight: "Morning surge pattern +22%"
  },
  recommendation: {
    engine: "StockSense Recommendation Engine · 98.4% Confidence",
    title: "STOCK RECOMMENDATION",
    subtitle: "Automated Batch Dispatch Reorder",
    batchTitle: "OPTIMAL BATCH",
    batchSub: "Standard Crate",
    batchValue: "34",
    calculus: {
      title: "REPLENISHMENT CALCULUS (7-DAY HORIZON)",
      model: "Deterministic Model",
      items: [
        { label: "Expected 7-day demand", value: "49", unit: "units" },
        { label: "[+] Safety stock", value: "10", unit: "units", color: "green" },
        { label: "[-] Current stock", value: "25", unit: "units", color: "red" },
        { label: "[=] Recommended purchase", value: "34", unit: "units", highlight: true }
      ]
    },
    footer: "Recommendation is based on recent sales velocity, expected demand and safety stock.",
    accordion: "How does this prevent waste?"
  },
  logistics: {
    cutoff: "45 mins remaining",
    orderTag: "Order by 12:30",
    desc: "Supplier: Fresh Farm Dairy Direct • Dispatched via 13:15 Co-op Van • Delivery window tomorrow 06:30 AM",
    assured: "Cold Chain Assured"
  },
  actions: {
    primary: "Create purchase order (34 units - ₹1,020) →",
    secondary: "Adjust recommendation",
    footer: "Auto-generates vendor PO #PO-8821 with 1-tap WhatsApp & EDI dispatch"
  }
};

app.get('/api/decision', (req, res) => {
  res.json(db.getSection('decision') || decisionData);
});

const slowMovingData = {
  header: {
    node: "Node #042 · Live",
    title: "Inventory"
  },
  pageTitle: {
    title: "Slow-Moving Products",
    subtitle: "Products occupying working capital without generating expected sales velocity.",
    badge: "Capital Optimization Engine · 30-Day Turn"
  },
  summary: {
    dormant: { value: "23", unit: "items", desc: "8.4% of catalog" },
    tiedUp: { value: "₹18,450", desc: "₹14,200 recoverable" },
    progress: { label: "Liquidity Release Potential", val: "77% Recoverable", pct: 77 },
    insight: "Re-activating these 23 SKUs cycles ₹18,450 back into high-velocity staples like Dairy & Bread."
  },
  chips: ["All 23 SKUs", "Packaged Breakfast (8)", "Snacks & Bakery"],
  items: [
    {
      sku: "SKU #BRK-402",
      bay: "Bay B-2 Endcap",
      name: "Corn Flakes Whole Grain",
      desc: "Crispy GoldenToasted - Kellogg's Pantry",
      image: "https://images.unsplash.com/photo-1521950311756-78eec3b6ce1e?auto=format&fit=crop&w=100&q=80",
      stats: [
        { label: "In Stock", val: "50", unit: "units", sub: "0.1/day rate", subColor: "red" },
        { label: "Sales (30d)", val: "3", unit: "sold", sub: "vs 18 bench" },
        { label: "Capital Tied", val: "₹7,500", unit: "", sub: "500d runway" }
      ],
      alert: { icon: "alert-triangle", text: "Velocity gap: -78% vs breakfast category baseline", color: "orange" },
      strategy: {
        type: "PROMOTION STRATEGY",
        tag: "15% Off",
        tagColor: "green",
        title: "15% Morning Promotional Offer",
        desc: "Trigger instant 15% markdown push to 84 local morning breakfast buyers. Projected to clear <b>28 units</b> in 14 days and recover <b>₹4,200 capital</b>.",
        priBtn: { text: "Deploy 15% Offer", icon: "zap" },
        secBtn: { text: "Adjust" }
      }
    },
    {
      sku: "SKU #SNK-118",
      bay: "Bay C-1 Front",
      name: "Artisan Butter & Choco Coo...",
      desc: "Rich Butter Shortbread - 200g Collector...",
      image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=100&q=80",
      stats: [
        { label: "In Stock", val: "34", unit: "units", sub: "0.17/day rate", subColor: "red" },
        { label: "Sales (30d)", val: "5", unit: "sold", sub: "vs 22 bench" },
        { label: "Capital Tied", val: "₹4,080", unit: "", sub: "204d runway" }
      ],
      alert: { icon: "asterisk", text: "Affinity signal: 62% of cookie buyers purchase Milk or Chai", color: "teal" },
      strategy: {
        type: "POS CROSS-MERCHANDISING",
        tag: "Bundle Duo",
        tagColor: "teal",
        title: "Bundle with Frequently Purchased Milk",
        desc: "Pair with Amul Fresh Milk 500ml as a 'Morning Teatime Duo' (+₹15 combo discount). Accelerates unit turnover by <b>3.4x</b> without margin erosion.",
        priBtn: { text: "Create Milk Bundle", icon: "link" },
        secBtn: { text: "Pairings" }
      }
    },
    {
      sku: "SKU #BEV-205",
      bay: "Bay A-3 Chilled",
      name: "Valencia Cold-Pressed Juice",
      desc: "100% Raw Pure Citrus - No Added Sugars",
      image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=100&q=80",
      stats: [
        { label: "In Stock", val: "27", unit: "units", sub: "0.13/day rate", subColor: "red" },
        { label: "Sales (30d)", val: "4", unit: "sold", sub: "vs 30 bench" },
        { label: "Capital Tied", val: "₹3,240", unit: "", sub: "202d runway" }
      ],
      alert: { icon: "users", text: "Audience match: 42 verified beverage subscribers within 1km", color: "gray" },
      strategy: {
        type: "AUDIENCE ACTIVATION",
        tag: "VIP Push",
        tagColor: "teal",
        title: "Target Customers Who Buy Beverages",
        desc: "Direct personalized StockSense WhatsApp alert to 42 recurring fresh juice shoppers with exclusive loyalty credit of ₹20.",
        priBtn: { text: "Send Targeted Campaign", icon: "send" },
        secBtn: { text: "Preview" }
      }
    }
  ],
  floating: {
    title: "MASTER EXECUTION",
    sub: "3 Automated Workflows",
    heading: "Batch Capital Optimization",
    desc: "Unlock an estimated <b>₹11,520 in working capital</b> over the next 14 days without manual re-tagging.",
    btn: "Execute All 3 Plans →"
  }
};

app.get('/api/slow-moving', (req, res) => {
  res.json(db.getSection('slow-moving') || slowMovingData);
});

const expiryData = {
  header: {
    node: "Node #042 · Live",
    title: "Inventory",
    tags: [
      { text: "Sri Lakshmi Stores - Perishable Watch" },
      { text: "Active Shield", icon: "shield", color: "green" }
    ]
  },
  pageTitle: {
    title: "Expiry Risk",
    subtitle: "Proactive margin salvage & perishable batch protection engine."
  },
  summary: {
    flagged: { value: "7", unit: "SKUs", desc: "Requires intervention", icon: "alert-circle" },
    risk: { value: "₹4,280", desc: "Perishable exposure", icon: "trending-down", color: "red" },
    reduction: {
      title: "Expected Reduction in Expiry Risk",
      val: "88% (-₹3,760)",
      pct: 88,
      desc: "Algorithmic clearance salvages ₹3,760 across 7 batches via dynamic hyper-local discovery."
    },
    alert: "Dynamic markdown trigger targeted notifications to nearby frequent shoppers, clearing batches before expiry without floor waste."
  },
  chips: ["All 7 SKUs", "Today (2)", "Next 3 Days (3)", "Next 7 Days (2)"],
  sections: [
    {
      title: "Today",
      color: "red",
      tag: "Urgent Clearance",
      desc: "2 SKUs · 10h remaining",
      items: [
        {
          image: "https://images.unsplash.com/photo-1627572703806-a83cbceac659?auto=format&fit=crop&w=100&q=80",
          name: "Artisan Cottage Cheese (Paneer 200g)",
          desc: "Fresh Dairy Batch R19... D91 · Bay A-2 Chilled",
          price: "₹960",
          priceColor: "red",
          stats: [
            { label: "Stock", val: "12 units" },
            { label: "Run Rate", val: "5/day -> 7 gap!" },
            { label: "Expires", val: "21:00 (10h)", color: "red" }
          ],
          action: {
            title: "Recommended Action",
            tag: "35% Flash Clearance",
            desc: "Pushes immediate alert to 131 high-affinity dinner cooks within 800m via grocery app.",
            progress: { label: "Risk reduction: 92% clearance projected", pct: 92 },
            btnPri: { text: "Deploy 35% Flash", icon: "zap" },
            btnSec: { text: "Quick Markdown" }
          }
        },
        {
          image: "https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=100&q=80",
          name: "Fresh Herb Guacamole Dip 150g",
          desc: "Short-life deli - Batch #C9... 44",
          price: "₹480",
          priceColor: "red",
          stats: [
            { label: "Stock", val: "4 units" },
            { label: "Velocity", val: "2/day" },
            { label: "Expiry", val: "Today 22:00", color: "red" }
          ],
          action: {
            title: "Cross-Merchandising",
            tag: "Buy 1 Get 1 with Nachos",
            progress: { label: "Risk reduction: 80% clearance", pct: 80 },
            btnPri: { text: "Activate BOGO Promotion", icon: "tag" }
          }
        }
      ]
    },
    {
      title: "Next 3 Days",
      color: "var(--primary-dark)",
      tag: "48h - 72h Window",
      desc: "3 SKUs · Calibrated",
      items: [
        {
          image: "https://images.unsplash.com/photo-1574246830509-f14d02336336?auto=format&fit=crop&w=100&q=80",
          name: "Artisan Set Curd / Yogurt 400g",
          desc: "Farm Fresh Dairy - Batch #Y0... 042 - Bay C-1",
          price: "₹1,920",
          stats: [
            { label: "Stock", val: "60 units" },
            { label: "Base Velocity", val: "3/day -> 54 unsold!" },
            { label: "Expiry", val: "Friday 8:00" }
          ],
          action: {
            title: "20% Smart Offer",
            tag: "Velocity Lift: 18/day",
            desc: "Recovers 94% wholesale capital before markdown burn aggressive on Friday morning.",
            progress: { label: "Expected reduction in expiry risk - 60% at-risk units", pct: 60 },
            btnPri: { text: "Deploy 20% Offer", icon: "tag" },
            btnSec: { text: "Adjust Discount" }
          }
        },
        {
          image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=100&q=80",
          name: "Whole Wheat Sourdough Loaf",
          desc: "Artisan Bakery - Batch #BK-18",
          price: "₹630",
          stats: [
            { label: "Stock", val: "14 units" },
            { label: "Velocity", val: "2.2/day" },
            { label: "Expiry", val: "3 Days" }
          ],
          action: {
            title: "POS Bundle with Dairy Butter",
            tag: "+65% uplift",
            btnPri: { text: "Bundle at POS", icon: "credit-card" }
          }
        }
      ]
    },
    {
      title: "Next 7 Days",
      color: "#10b981",
      tag: "Monitoring Window",
      desc: "2 SKUs · Early Pace",
      items: [
        {
          image: "https://images.unsplash.com/photo-1600742183226-c11df5d4df4b?auto=format&fit=crop&w=100&q=80",
          name: "Organic Oat Milk 1L",
          desc: "Plant Dairy - Batch #OM-104",
          price: "₹1,290",
          stats: [
            { label: "Stock", val: "18 units" },
            { label: "Velocity", val: "1.5/day" },
            { label: "Expiry", val: "6 Days" }
          ],
          action: {
            title: "Featured in 'Healthy Breakfast' discovery tab",
            tag: "24% absorption",
            btnSec: { text: "Boost Discovery" }
          }
        },
        {
          image: "https://images.unsplash.com/photo-1596765792949-335fc0ea72ba?auto=format&fit=crop&w=100&q=80",
          name: "Cold-Pressed Almond Milk 500ml",
          desc: "Batch #AM-88 - Bay A-1 Chilled",
          price: "₹480",
          stats: [
            { label: "Stock", val: "9 units" },
            { label: "Velocity", val: "1.0/day" },
            { label: "Expiry", val: "7 Days" }
          ],
          action: {
            title: "Gentle 10% Early Bird push",
            tag: "Automated",
            btnSec: { text: "Set Automation" }
          }
        }
      ]
    }
  ],
  floating: {
    title: "Autonomous Expiry Shield",
    tag: "₹3,760 Salvage",
    sub: "6 smart clearance actions ready",
    desc: "Authorize batch sync to automatically deploy targeted dynamic markdowns, cross-category BOGOs, and app push triggers.",
    btn: "Authorize Expiry Actions →"
  }
};

app.get('/api/expiry', (req, res) => {
  res.json(db.getSection('expiry') || expiryData);
});

const smartOfferData = {
  header: { node: "Node #042" },
  product: {
    sku: "#BRK-402",
    bay: "Bay B-2",
    name: "Kellogg's Whole Gr...",
    desc: "500g Eco-Box - Wholesale ₹115.00 · MRP ₹150.00",
    image: "https://images.unsplash.com/photo-1521950311756-78eec3b6ce1e?auto=format&fit=crop&w=100&q=80",
    tag: "ENDCAP",
    marginTitle: "Base Margin",
    marginValue: "23.3% (₹35)"
  },
  stats: [
    { label: "In Stock", icon: "box", val: "50", unit: "boxes", sub: "₹7,500 locked" },
    { label: "Run Rate", icon: "activity", val: "0.10", unit: "/ day", sub: "3 units / 30d", subColor: "red" },
    { label: "Trend Velocity", icon: "trending-down", val: "-78%", unit: "", sub: "vs Dry Cereals", valColor: "red" },
    { label: "Expiry Window", icon: "clock", val: "21", unit: "days", sub: "Batch # CF-202" }
  ],
  solver: {
    confidence: "94.2% Confidence",
    suggestion: {
      net: "- ₹12.50",
      offer: "15% Off",
      price: "₹127.50",
      mrp: "₹150",
      marginTag: "9.8% Margin",
      text: "High stock & depleted velocity alert. At current 0.1/day pace, stock requires 500 days to deplete. Risk of full write-off (₹5,750 cost) before 21-day expiry."
    },
    recovery: "-68% Risk",
    liquidity: "~₹1,275"
  },
  adjust: {
    depth: { label: "Optimal: 12% - 18%", val: "15%", sub: "₹127.50 / unit · Cost ₹115.00" },
    duration: { label: "Ends Friday 23:59", options: [{val: "2d"}, {val: "3d", rec: true}, {val: "5d"}, {val: "7d"}] },
    reach: [
      { title: "Frequent Cereal Buyers", tag: "AI Targeted", desc: "84 verified breakfast & cereal repeat shoppers within 1.2 km. High affinity score (0% discount fatigue).", selected: true },
      { title: "Store Broadcast (All Local Shoppers)", desc: "1,240 nearby registered app users. Faster clearance pace, higher margin cannibalization risk." }
    ],
    channels: ["Grocify App Alert", "WhatsApp Direct Push", "Shelf POS Auto-Tag"]
  },
  impact: {
    revenue: { val: "₹1,020 - ₹1,275", sub: "8 to 10 units depleted" },
    margin: { val: "₹100 - ₹125", sub: "Min. ₹12.50/unit" },
    reallocation: { title: "Endcap Reallocation", desc: "Frees shelf depth for High-Velocity Granola", space: "+24% space" }
  },
  footer: {
    guardrail: "Complies with Store Margin Guardrail (Min. 10% gross margin preserved).",
    priBtn: "Publish Smart Offer",
    priSub: "Pushes instantly to 84 targeted shoppers & updates POS",
    secBtn: "Save as Draft Scenario"
  }
};

app.get('/api/smart-offer', (req, res) => {
  res.json(db.getSection('smart-offer') || smartOfferData);
});

const demandData = {
  header: {
    title: "Grocify",
    node: "Node #042",
    sub: "Greenfield Market • 428 L...",
    tabs: ["Shopkeeper OS", "Customer Pulse", "STORE INTELLIGENCE"]
  },
  pageTitle: {
    node: "Node #042 - Live Sync",
    latency: "4s latency",
    title: "Demand Intelligence",
    store: "Sri Lakshmi Stores",
    cluster: "Greenfield Cluster",
    desc: "Predictive neural forecasting engine trained on hyper-local POS cadence and weather signals."
  },
  telemetry: {
    tag: "REALTIME TELEMETRY",
    acc: "96.4% Accuracy",
    title: "Aggregate Demand Continuum",
    ranges: ["7 Days", "30 Days", "90 Days"],
    activeRange: "30 Days",
    metrics: [
      { label: "Daily Velocity", val: "184", unit: "u/d", sub: "+14.2%", subColor: "green" },
      { label: "Forecast Peak", val: "248", unit: "units", sub: "Sat Morning" },
      { label: "Volatility", val: "4.2%", sub: "Low Index", subColor: "green" }
    ],
    chart: { peak: "Sat Peak: 248 units (+31% lift)" }
  },
  insights: {
    title: "DEMAND INSIGHTS",
    sub: "4 Key Velocity Shifts",
    items: [
      {
        icon: "glass-water",
        name: "Amul & Fresh Milk 500ml",
        tag: "+18%",
        tagType: "green",
        desc: "Demand increasing - High priority",
        ai: "Morning co-op subscriptions up +24%. Risk of early 11:30 AM stockout without buffer.",
        footLeft: "Lead Time: 6h",
        footRight: { text: "Adjust Par Level (+12 units)", type: "pri" }
      },
      {
        icon: "croissant",
        name: "Artisan Brown & Sourdough",
        tag: "→ Stable",
        tagType: "gray",
        desc: "Predictable cadence - Daily Fresh",
        ai: "Consistent 6.2 units/day consumption. Zero variance detected across 14-day window.",
        footLeft: { icon: "check-circle", text: "Optimal 100% sync", color: "green" },
        footRight: { text: "No adjustment needed" }
      },
      {
        icon: "egg",
        name: "Cage-Free Farm Eggs (12pk)",
        tag: "↑ 9%",
        tagType: "green",
        desc: "Weekend spike detected",
        ai: "Friday evening to Sunday surge. Recommend ordering 2 additional crates by Thursday 18:00.",
        footLeft: { icon: "clock", text: "Order before Thu 18:00" },
        footRight: { text: "Queue PO", type: "sec", icon: "file-text" }
      },
      {
        icon: "cookie",
        name: "Artisan Cookies & Savories",
        tag: "↑ 22%",
        tagType: "green",
        desc: "Strong weekend demand",
        ai: "Teatime bundle affinity with Chai & Milk drives weekend basket penetration.",
        footLeft: "Counter Basket Boost",
        footRight: { text: "Feature on POS", type: "sec", icon: "tag" }
      }
    ]
  },
  predictions: {
    title: "NEXT 7 DAYS PREDICTION",
    sub: "Working Capital Impact",
    items: [
      {
        image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80",
        name: "Milk 500ml",
        stats: "Daily avg: 49/d - 98% conf",
        sub: "₹10,260 allocated",
        units: "342"
      },
      {
        image: "https://images.unsplash.com/photo-1574246830509-f14d02336336?auto=format&fit=crop&w=100&q=80",
        name: "Fresh Curd / Yogurt 400g",
        stats: "Daily avg: 24/d - 96% conf",
        sub: "+ 16 safe buffer - ₹8,060",
        subColor: "green",
        units: "168"
      },
      {
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=100&q=80",
        name: "Sourdough & Wheat Loaves",
        stats: "Daily avg: 14/d - 96% conf",
        sub: "Cadence: Daily fresh bake",
        units: "98"
      },
      {
        image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=100&q=80",
        name: "Gourmet Juice 1L",
        stats: "Daily avg: 9.1/d - 89% conf",
        sub: "Promotional lift + 15 units",
        subColor: "green",
        units: "64"
      }
    ]
  },
  floating: {
    title: "Autonomous Par Level Sync",
    desc: "Apply predicted demand thresholds to automatically update replenishment triggers across all 4 key categories.",
    btn: "Sync Auto-Reorder Thresholds →"
  }
};

app.get('/api/demand', (req, res) => {
  res.json(db.getSection('demand') || demandData);
});

const simulatorData = {
  header: {
    node: "Node #042",
    title: "Inventory Simulator",
    sub: "StockSense Simulation Engine"
  },
  pageTitle: {
    badge: "Node #042 - Real-Time Simulation Engine",
    feed: "Live Monte Carlo Feed",
    title: "Inventory Simulator",
    desc: "Test a decision before you make it."
  },
  product: {
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=100&q=80",
    bay: "Bay A-2",
    name: "Milk — 500 ml",
    temp: "3.4°C",
    desc: "Fresh Pasteurized Dairy - Short Cycle Shelf...",
    mrp: "₹30",
    cost: "₹22.50",
    margin: "25%"
  },
  stats: [
    { label: "Current Stock", icon: "box", val: "25", unit: "units", sub: "Runway: 3.6d", subColor: "green" },
    { label: "Daily Demand", icon: "trending-up", val: "7", unit: "/ day", sub: "↑ 18% vs base", subColor: "green" },
    { label: "7-Day Demand", icon: "calendar", val: "49", unit: "units", sub: "Confidence 96%", subColor: "gray" }
  ],
  order: {
    title: "WHAT IF I ORDER:",
    tag: "AI Optimal Batch",
    current: { val: "34", unit: "units", commit: "₹765 commitment" },
    slider: { min: "Min buffer: 10", anchor: "Anchor: 34", max: "Crate max: 50" },
    exposure: "Capital exposure (Cost x Qty): 34 x ₹22.50 = ₹765.00"
  },
  chart: {
    sub: "Dynamic Run-Rate Projection",
    title: "7-Day Trajectory Curve",
    delivery: "Tomorrow 06:30 AM",
    sla: "100% On-Time SLA"
  },
  baseline: {
    title: "Baseline Demand",
    tag: "7 units/day - 49 total",
    estSub: "Est. Stock After 7 Days",
    estVal: "10",
    estUnit: "units remaining",
    mathSub: "Buffer Math",
    mathVal: "25 + 34 - 49 = 10",
    stockout: { title: "Stockout Risk", val: "LOW - 4%", color: "green", desc: "No stock gaps predicted" },
    overstock: { title: "Overstock Risk", val: "LOW - 6%", color: "green", desc: "Shelf safe before 48h expiry" },
    recommendation: {
      title: "Recommended ✓ Good decision",
      desc: "Maintains optimal 1.4-day safety cushion without cold storage overflow or spoilage hazard."
    }
  },
  stress: {
    title: "What if demand increases 20%?",
    sub: "Sensitivity Stress Test - Weekend / Weather Spike",
    param: "Parameters: 8.4 units/day",
    left: { val: "0", sub: "units left after 7d" },
    surge: { title: "Surge Run-Rate", val: "25 + 34 - 59 = 0" },
    stockout: { title: "Stockout Risk", val: "HIGH - 68%", color: "red", desc: "Stockout by Sun 14:00", descColor: "red" },
    overstock: { title: "Overstock Risk", val: "ZERO - 0%", color: "green", desc: "Zero spoilage hazard" },
    warning: "Increase order quantity: <b>+6 to +8 units recommended</b> to avoid Sunday peak exhaustion.",
    btn: "Simulate +8 Units (42 total)"
  },
  footer: {
    secBtn: "Save Draft",
    priBtn: "Apply recommendation (Order 34 units)",
    text: "Generates PO #PO-8821 & updates automated re-order thresh..."
  }
};

app.get('/api/simulator', (req, res) => {
  res.json(db.getSection('simulator') || simulatorData);
});

const learningData = {
  header: {
    title: "How Stocksense Learns",
    sub: "Node #042 · Intelligence Ecosystem"
  },
  pageTitle: {
    tag: "Live Closed-Loop Architecture - 99.4% Sync",
    title: "The Self-Reinforcing Demand Loop",
    desc: "Every basket scan refines local neighborhood predictive models, continually tuning restocking thresholds before runouts occur."
  },
  flow: {
    title: "ARCHITECTURE FLOW",
    status: "Active: Continuous Sync",
    center: { title: "STOCKSENSE", sub1: "Neural Engine", sub2: "42ms - 84 Nodes" },
    nodes: [
      { icon: "shopping-bag", title: "Customers", sub: "Basket Rhythms", edge: "Purchases +" },
      { icon: "radio", title: "Demand Signal", sub: "Real-time Velocity", edge: "Forecasts +" },
      { icon: "package", title: "Inventory Logic", sub: "Auto Par Levels", edge: "+ Smart PO" },
      { icon: "check-circle", title: "Availability", sub: "Zero Runouts", edge: "+ Repeat Trust" }
    ],
    footer: {
      title: "Autonomous Reinforcement Cycle",
      desc: "Every transaction automatically fine-tunes demand forecasts, generating preventative..."
    }
  },
  impact: {
    title: "Today's Loop Impact",
    sub: "Cluster Telemetry - Greenfield Co-op Node",
    tag: "Live Feed",
    stats: [
      { icon: "receipt", label: "Purchases", val: "1,284", sub1: "Scanned & correlated", sub2: { text: "↑ +14% vs avg", color: "green" } },
      { icon: "activity", label: "Signals Caught", val: "42", sub1: "Velocity anomalies", sub2: { text: "All localized", dot: true, color: "green" } },
      { icon: "truck", label: "Restock POs", val: "18", sub1: "Par trigger batches", sub2: { text: "✓ 100% matched", color: "green" } },
      { icon: "hourglass", label: "Expiry Saved", val: "7", sub1: "Fresh items saved", sub2: { text: "Zero spoil loss", icon: "box", color: "green" } }
    ]
  },
  trace: {
    title: "Live Trace Example",
    sub: "Daily causality chain: Fresh Farm Milk 500ml",
    tag: "SKU #4892",
    steps: [
      { num: "1", title: "Shift in Neighborhood Rhythms", time: "07:42 AM", desc: "Morning co-op pre-orders surged by +24%. Baskets heavily skewed towards dairy essentials earlier than historical baseline.", tag: "↑ +24% customer morning demand" },
      { num: "2", title: "Autonomous Signal Synthesis", time: "08:05 AM", desc: "StockSense correlated velocity with temperature forecasts and local holiday prep, confirming an +18% sustained demand shift.", tag: "⚡ 96% AI confidence score" },
      { num: "3", title: "Targeted Restock Recommendation", time: "08:16 AM", desc: "Store manager alert generated: PO #8821 triggered with local dairy supplier for 34 supplemental cartons before midday delivery cutoff.", tag: "Recommended +34 units (Accepted)" },
      { num: "✓", title: "Perfection on Shelf & Margins", badge: "Resolved", desc: "Zero morning stockouts recorded. 100% shelf availability maintained while avoiding over-ordering and perishability write-offs.", tags: ["₹1,020 Margin Preserved", "0 Stockouts"] }
    ]
  },
  footer: {
    btnPri: "Explore Active Signals (42)",
    btnSec: "Share Node Intelligence Summary"
  }
};

app.get('/api/learning', (req, res) => {
  res.json(db.getSection('learning') || learningData);
});


// ==========================================
// SQLITE DATABASE INITIALIZATION & SEEDING
// ==========================================
db.seedEcosystemIfEmpty({
  customer: customerData,
  pattern: patternData,
  product: productData,
  discover: discoverData,
  merchant: merchantData,
  calibration: calibrationData,
  shopkeeper: shopkeeperData,
  inventory: inventoryIntelligenceData,
  decision: decisionData,
  'slow-moving': slowMovingData,
  expiry: expiryData,
  'smart-offer': smartOfferData,
  demand: demandData,
  simulator: simulatorData,
  learning: learningData
});

db.seedProductsIfEmpty([
  {
    id: "amul-milk-500",
    name: "Amul Milk — 500 ml",
    brand: "FRESH CO-OP DAIRY",
    description: "Daily household staple with 3.0% Fat & 8.5% SNF homogenized nutrition",
    price: 30,
    stock: 24,
    daily_velocity: 7,
    depletion_runway: "3.4 days remaining",
    demand_trend: "+18%",
    category: "Dairy & Staples",
    tags: "Pasteurised, Fresh Morning Supply",
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "farm-milk-1l",
    name: "Farmhouse Fresh Milk (1L)",
    brand: "FRESH CO-OP",
    description: "Cold-chain whole farm fresh milk.",
    price: 65,
    stock: 18,
    daily_velocity: 6,
    depletion_runway: "3 days remaining",
    demand_trend: "High",
    category: "Dairy",
    tags: "Chilled, 7-day regular",
    image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "wheat-bread",
    name: "Artisan Whole Wheat Bread",
    brand: "BakeHouse Artisans",
    description: "Freshly baked whole wheat artisanal loaf.",
    price: 45,
    stock: 15,
    daily_velocity: 8,
    depletion_runway: "2 days remaining",
    demand_trend: "+11%",
    category: "Bakery",
    tags: "Fresh, Morning run",
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "free-range-eggs",
    name: "Organic Free-Range Eggs (6pk)",
    brand: "Pure Farm Poultry",
    description: "Certified organic free-range farm eggs.",
    price: 72,
    stock: 12,
    daily_velocity: 4,
    depletion_runway: "4 days remaining",
    demand_trend: "Stable",
    category: "Poultry",
    tags: "Organic, High Protein",
    image_url: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "country-tomatoes",
    name: "Fresh Country Tomatoes (1kg)",
    brand: "Local Farm Direct",
    description: "Ripe desi field-grown country tomatoes.",
    price: 38,
    stock: 30,
    daily_velocity: 12,
    depletion_runway: "2.5 days remaining",
    demand_trend: "+15%",
    category: "Fresh Produce",
    tags: "Daily Essential",
    image_url: "https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=200&q=80"
  }
]);

// ==========================================
// DATABASE REST API ENDPOINTS
// ==========================================

// GET all products from SQLite
app.get('/api/products', (req, res) => {
  try {
    const products = db.getAllProducts();
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product by ID
app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new product (Shopkeeper adding to SQLite inventory)
app.post('/api/products', (req, res) => {
  try {
    const { name, price, stock, brand, category, description, image_url } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }
    const newProduct = db.addProduct({
      name,
      price: price || 0,
      stock: stock || 10,
      brand: brand || 'Sri Lakshmi Stores',
      category: category || 'General',
      description: description || 'Fresh store arrival.',
      image_url: image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'
    });
    console.log(`[DB] Product added to SQLite: "${newProduct.name}" (ID: ${newProduct.id})`);
    res.status(201).json({ success: true, message: 'Product successfully saved in SQLite database', data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all customer orders from SQLite
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.getAllOrders();
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single order by ID with live order tracking details
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Live order tracking metadata
    const tracking = {
      orderId: order.id,
      status: order.status || 'Confirmed',
      createdAt: order.created_at,
      etaMinutes: 12,
      deliveryPartner: {
        name: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        rating: '4.9 ★',
        vehicle: 'Ather EV · KA-01-EQ-4290',
        badge: 'Top Neighborhood Courier'
      },
      store: {
        name: 'Sri Lakshmi Stores',
        node: 'NODE-042',
        address: 'Greenfield Market · 0.8 km away',
        phone: '+91 98450 12345'
      },
      timeline: [
        { title: 'Order Confirmed', time: 'Just now', desc: 'Accepted by Sri Lakshmi Stores', state: 'done' },
        { title: 'Packed & Quality Verified', time: '1 min ago', desc: 'Insulated zero-waste pantry bag', state: 'done' },
        { title: 'Out for Delivery', time: 'In transit', desc: 'Courier Ramesh picked up order (0.6 km away)', state: 'active' },
        { title: 'Delivered', time: 'Expected ~12 mins', desc: 'Doorstep contactless delivery', state: 'pending' }
      ]
    };

    res.json({ success: true, data: { ...order, tracking } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST place order (Customer checkout saved to SQLite)
app.post('/api/orders', (req, res) => {
  try {
    const { items, total_amount, payment_method, delivery_address, customer_name } = req.body;
    const order = db.createOrder({
      customer_name: customer_name || 'Arjun',
      items: items || [],
      total_amount: total_amount || 0,
      payment_method: payment_method || 'UPI / QR',
      delivery_address: delivery_address || '123/A, Green Valley Apartments, Bangalore'
    });
    console.log(`[DB] Order placed in SQLite: #${order.id} for ₹${order.total_amount}`);
    res.status(201).json({ success: true, message: 'Order successfully saved in SQLite database', data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT ENDPOINTS
// ==========================================

// POST Register new user (Customer or Merchant)
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password, role, store_name, address } = req.body;
    
    if (!name || (!email && !phone)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Full name and at least a phone number or email are required.' 
      });
    }

    // Check duplicate phone
    if (phone) {
      const existingByPhone = db.findUser(phone.trim());
      if (existingByPhone) {
        return res.status(409).json({ 
          success: false, 
          error: 'An account with this phone number already exists. Please sign in instead.' 
        });
      }
    }

    // Check duplicate email
    if (email) {
      const existingByEmail = db.findUser(email.trim());
      if (existingByEmail) {
        return res.status(409).json({ 
          success: false, 
          error: 'An account with this email address already exists. Please sign in instead.' 
        });
      }
    }

    const newUser = db.registerUser({
      name: name.trim(),
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      password: password || '123456',
      role: role || 'customer',
      store_name: store_name || 'Sri Lakshmi Stores',
      address: address || '123/A, Green Valley Apartments, Bangalore'
    });

    console.log(`[DB] Successfully registered new user: ${newUser.name} (${newUser.role})`);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Grocify.',
      token: 'jwt_' + Date.now(),
      user: newUser
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Sign in user (Customer or Merchant)
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password, role } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number, email, or merchant ID is required.' 
      });
    }

    const trimmedId = identifier.trim();
    const user = db.findUser(trimmedId);

    if (!user) {
      // Demo credentials fallback
      if (trimmedId === '9876543210' || trimmedId === 'arjun@example.com' || trimmedId === 'MERCH-04') {
        const isMerchant = (trimmedId === 'MERCH-04' || role === 'merchant');
        const fallback = {
          id: isMerchant ? 'user_merchant_04' : 'user_arjun',
          name: isMerchant ? 'Ramesh Patel' : 'Arjun Sharma',
          role: isMerchant ? 'merchant' : 'customer',
          phone: trimmedId,
          store_name: 'Sri Lakshmi Stores',
          address: isMerchant ? 'Shop #4, Main Bazaar, Bangalore' : '123/A, Green Valley Apartments, Bangalore'
        };
        return res.json({
          success: true,
          message: 'Welcome back to Grocify!',
          token: 'jwt_demo_' + Date.now(),
          user: fallback
        });
      }
      return res.status(401).json({ 
        success: false, 
        error: 'Account not found. Please check your credentials or register a new account.' 
      });
    }

    if (password && user.password && user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid password. Please check your password and try again.' 
      });
    }

    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      message: 'Welcome back to Grocify!',
      token: 'jwt_' + Date.now(),
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET current authenticated user profile
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'user_arjun',
      name: 'Arjun Sharma',
      email: 'arjun@example.com',
      phone: '9876543210',
      role: 'customer',
      store_name: 'Sri Lakshmi Stores',
      address: '123/A, Green Valley Apartments, Bangalore'
    }
  });
});

// GET all registered users list
app.get('/api/users', (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CUSTOMER PANTRY & CONSUMPTION TRACKER API
// ==========================================

// GET customer pantry items
app.get('/api/pantry', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const items = db.getPantryItems(userId);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET day-by-day pantry ingredients addition trend analytics
app.get('/api/pantry/analytics/day-by-day', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const days = parseInt(req.query.days) || 7;
    const stats = db.getPantryDayByDayStats(userId, days);
    res.json({ success: true, days, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single pantry item
app.get('/api/pantry/:id', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const item = db.getPantryItemById(req.params.id, userId);
    if (!item) return res.status(404).json({ success: false, error: 'Pantry item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add new pantry item
app.post('/api/pantry', (req, res) => {
  try {
    const {
      user_id, name, category, unit_type, display_unit, purchased_qty,
      base_purchased_qty, base_unit, purchase_date, expiry_date,
      daily_usage_base, daily_usage_display, daily_usage_unit,
      low_stock_threshold_base, low_stock_threshold_display, low_stock_threshold_unit,
      current_stock_base, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }

    const userId = user_id || 'user_arjun';
    const pQty = parseFloat(purchased_qty) || 0;
    const basePQty = parseFloat(base_purchased_qty) || pQty;
    const curStock = (current_stock_base !== undefined && current_stock_base !== null) 
      ? parseFloat(current_stock_base) 
      : basePQty;

    const newItem = db.addPantryItem({
      user_id: userId,
      name: name.trim(),
      category: category || 'Food & Grains',
      unit_type: unit_type || 'weight',
      display_unit: display_unit || 'kg',
      purchased_qty: pQty,
      base_purchased_qty: basePQty,
      base_unit: base_unit || 'g',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      last_updated_date: new Date().toISOString().split('T')[0],
      expiry_date: expiry_date || null,
      daily_usage_base: parseFloat(daily_usage_base) || 0,
      daily_usage_display: parseFloat(daily_usage_display) || 0,
      daily_usage_unit: daily_usage_unit || 'g',
      low_stock_threshold_base: parseFloat(low_stock_threshold_base) || 0,
      low_stock_threshold_display: parseFloat(low_stock_threshold_display) || 0,
      low_stock_threshold_unit: low_stock_threshold_unit || 'g',
      manual_usage_total_base: 0,
      current_stock_base: curStock,
      notes: notes || ''
    });

    console.log(`[Pantry] Item added for ${userId}: ${newItem.name} (Stock: ${newItem.current_stock_base}${newItem.base_unit})`);
    res.status(201).json({ success: true, message: 'Item added to personal pantry', data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update pantry item
app.put('/api/pantry/:id', (req, res) => {
  try {
    const userId = req.body.user_id || req.query.user_id || 'user_arjun';
    const updated = db.updatePantryItem(req.params.id, userId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }
    res.json({ success: true, message: 'Pantry item updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record consumption/usage for pantry item
app.post('/api/pantry/:id/usage', (req, res) => {
  try {
    const userId = req.body.user_id || req.query.user_id || 'user_arjun';
    const { used_base, date } = req.body;
    
    if (used_base === undefined || used_base === null || parseFloat(used_base) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid usage quantity is required.' });
    }

    const updated = db.recordPantryUsage(req.params.id, userId, parseFloat(used_base), date);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }

    console.log(`[Pantry] Recorded usage for ${updated.name}: -${used_base}${updated.base_unit}. Remaining: ${updated.current_stock_base}${updated.base_unit}`);
    res.json({ success: true, message: 'Daily usage recorded', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE pantry item
app.delete('/api/pantry/:id', (req, res) => {
  try {
    const userId = req.query.user_id || (req.body && req.body.user_id) || 'user_arjun';
    const deleted = db.deletePantryItem(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }
    res.json({ success: true, message: 'Pantry item removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// SMART GROCERY SHOPPING LIST & BUDGET INTELLIGENCE API
// ========================================================

// GET customer shopping list items
app.get('/api/shopping-list', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const status = req.query.status || null;
    const items = db.getShoppingItems(userId, status);
    const budget = db.getCustomerBudget(userId);

    const pendingItems = items.filter(it => it.status === 'pending');
    const totalEstimatedCost = pendingItems.reduce((acc, it) => {
      let price = it.estimated_price || 0;
      if (it.comparison && it.comparison.recommendedShop) {
        return acc + (it.comparison.estimatedTotal || (it.quantity * price));
      }
      return acc + (it.quantity * price);
    }, 0);

    const roundedEstCost = Math.round(totalEstimatedCost * 100) / 100;
    const remainingBudget = Math.round((budget - roundedEstCost) * 100) / 100;

    res.json({
      success: true,
      count: items.length,
      data: items,
      items: items,
      budget,
      totalEstimatedCost: roundedEstCost,
      remainingBudget
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add item to shopping list
app.post('/api/shopping-list', (req, res) => {
  try {
    const {
      user_id, category, unit, expected_date,
      estimated_price, estimated_shop, is_user_price,
      user_entered_price, pantry_item_id, notes
    } = req.body;

    const name = (req.body.name || req.body.product_name || '').trim();
    const quantity = parseFloat(req.body.quantity !== undefined ? req.body.quantity : req.body.required_quantity) || 1;
    const budget = req.body.budget !== undefined ? req.body.budget : req.body.item_budget;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }

    const userId = user_id || 'user_arjun';
    const newItem = db.addShoppingItem({
      user_id: userId,
      name: name,
      category: category || 'Food & Grains',
      quantity: quantity,
      unit: unit || 'kg',
      expected_date: expected_date || new Date().toISOString().split('T')[0],
      budget: budget !== undefined && budget !== null ? parseFloat(budget) : null,
      estimated_price: estimated_price !== undefined ? parseFloat(estimated_price) : undefined,
      estimated_shop,
      is_user_price: is_user_price ? 1 : 0,
      user_entered_price: user_entered_price !== undefined ? parseFloat(user_entered_price) : undefined,
      pantry_item_id: pantry_item_id || null,
      notes: notes || ''
    });

    console.log(`[ShoppingList] Added item for ${userId}: ${newItem.name || newItem.product_name} (${newItem.quantity || newItem.required_quantity} ${newItem.unit})`);
    res.status(201).json({ success: true, message: 'Item added to shopping list', data: newItem, item: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET compare prices across neighborhood shops for a product
app.get('/api/shopping-list/compare-prices', (req, res) => {
  try {
    const productName = req.query.product_name || req.query.name || '';
    const quantity = parseFloat(req.query.quantity || req.query.required_quantity) || 1;
    const unit = req.query.unit || 'kg';
    const result = db.comparePricesForProduct(productName, quantity, unit);
    res.json({ success: true, data: result, comparison: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET market prices catalog
app.get('/api/shopping-list/market-prices', (req, res) => {
  try {
    const query = req.query.q || '';
    const prices = db.getMarketPrices(query);
    res.json({ success: true, count: prices.length, data: prices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer shopping budget
app.get('/api/shopping-list/budget', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const budget = db.getCustomerBudget(userId);
    res.json({ success: true, budget, total_budget: budget.total_budget });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST update customer shopping budget
app.post('/api/shopping-list/budget', (req, res) => {
  try {
    const userId = req.body.user_id || 'user_arjun';
    const budgetVal = parseFloat(req.body.budget !== undefined ? req.body.budget : req.body.total_budget) || 1000;
    const updated = db.setCustomerBudget(userId, budgetVal);
    res.json({ success: true, message: 'Shopping budget updated', budget: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST confirm purchase & update My Pantry
app.post('/api/shopping-list/confirm-purchase', (req, res) => {
  try {
    const {
      shopping_item_id, item_id, product_name, name, category,
      unit, unit_price, total_amount, shop_name, purchase_date,
      expiry_date, update_pantry, user_id, pantry_item_id
    } = req.body;

    const shoppingId = shopping_item_id || item_id || null;
    let prodName = (product_name || name || '').trim();
    const purchasedQty = parseFloat(req.body.purchased_qty !== undefined ? req.body.purchased_qty : (req.body.actual_quantity !== undefined ? req.body.actual_quantity : req.body.quantity)) || 1;

    const userId = user_id || 'user_arjun';
    const result = db.recordPurchaseAndUpdatePantry({
      shopping_item_id: shoppingId,
      product_name: prodName,
      category,
      purchased_qty: purchasedQty,
      unit: unit || 'kg',
      unit_price: parseFloat(unit_price) || 0,
      total_amount: total_amount !== undefined ? parseFloat(total_amount) : undefined,
      shop_name: shop_name || 'Sri Lakshmi Stores',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      expiry_date: expiry_date || null,
      update_pantry: update_pantry !== false,
      user_id: userId,
      pantry_item_id
    });

    console.log(`[ShoppingList] Purchase confirmed for ${userId}: ${result.purchase.product_name} (${purchasedQty} ${unit || 'kg'}) from ${shop_name}. Pantry updated: ${update_pantry !== false}`);
    res.status(201).json({
      success: true,
      message: 'Purchase recorded and pantry updated successfully',
      data: result,
      purchase: result.purchase,
      pantry_item: result.pantry_item
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer grocery purchase history
app.get('/api/shopping-list/purchases', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const history = db.getPurchaseHistory(userId);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single shopping list item (must be after specific sub-routes)
app.get('/api/shopping-list/:id', (req, res) => {
  try {
    const userId = req.query.user_id || 'user_arjun';
    const item = db.getShoppingItemById(req.params.id, userId);
    if (!item) return res.status(404).json({ success: false, error: 'Shopping item not found' });
    res.json({ success: true, data: item, item: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update shopping list item
app.put('/api/shopping-list/:id', (req, res) => {
  try {
    const userId = req.body.user_id || req.query.user_id || 'user_arjun';
    const updated = db.updateShoppingItem(req.params.id, userId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }
    res.json({ success: true, message: 'Shopping list item updated', data: updated, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE shopping list item
app.delete('/api/shopping-list/:id', (req, res) => {
  try {
    const userId = req.query.user_id || (req.body && req.body.user_id) || 'user_arjun';
    const deleted = db.deleteShoppingItem(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item not found or unauthorized' });
    }
    res.json({ success: true, message: 'Shopping list item removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET SQLite Database Status & Telemetry
app.get('/api/db/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  const dbStats = db.getStats();
  res.json({
    status: 'ok',
    message: 'Grocify Backend & Database Active',
    database: {
      engine: dbStats.database,
      file: dbStats.file,
      tables: dbStats.tables,
      sizeKB: dbStats.fileSizeKB,
      status: dbStats.status
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
