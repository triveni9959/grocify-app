import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Bread to be clickable
content = content.replace(
    '<div class="item-row">\n            <div class="item-img">🥐</div>',
    '<div class="item-row" style="cursor: pointer;" onclick="loadProduct(\'bread\')">\n            <div class="item-img">🥐</div>'
)

# 2. Add new products to mockProducts
new_mock_products = """
                      bread: {
                        brand: 'BAKERS CHOICE',
                        name: 'Artisan Whole Wheat Bread',
                        price: '₹45',
                        desc: 'Freshly baked whole wheat bread, rich in fiber.',
                        img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '8%',
                        stock: '15',
                        cycleTitle: 'You usually buy this every 5 days.',
                        cycleDesc: 'Last bought 3 days ago · Replenishment predicted in ~2 days'
                      },
                      oil: {
                        brand: 'PURE LIFE',
                        name: 'Refined Sunflower Oil (1L)',
                        price: '₹140',
                        desc: 'Light and healthy cooking oil.',
                        img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '3%',
                        stock: '30',
                        cycleTitle: 'You usually buy this every 20 days.',
                        cycleDesc: 'Last bought 10 days ago · Replenishment predicted in ~10 days'
                      },
                      ghee: {
                        brand: 'GOLDEN COW',
                        name: 'Pure Desi Ghee (500ml)',
                        price: '₹350',
                        desc: 'Aromatic pure desi ghee.',
                        img: 'https://images.unsplash.com/photo-1627998679093-60fcf52240b2?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '2%',
                        stock: '12',
                        cycleTitle: 'You usually buy this every 45 days.',
                        cycleDesc: 'Last bought 40 days ago · Replenishment predicted in ~5 days'
                      },
                      daal: {
                        brand: 'FARM FRESH',
                        name: 'Toor Daal (1kg)',
                        price: '₹120',
                        desc: 'Unpolished split pigeon peas.',
                        img: 'https://images.unsplash.com/photo-1582283597653-53535e6191c0?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '7%',
                        stock: '50',
                        cycleTitle: 'You usually buy this every 15 days.',
                        cycleDesc: 'Last bought 10 days ago · Replenishment predicted in ~5 days'
                      },
                      turmeric: {
                        brand: 'SPICE GOLD',
                        name: 'Turmeric Powder (200g)',
                        price: '₹45',
                        desc: 'Rich in curcumin, freshly ground turmeric.',
                        img: 'https://images.unsplash.com/photo-1615486171448-4357732a39d4?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '1%',
                        stock: '25',
                        cycleTitle: 'You usually buy this every 60 days.',
                        cycleDesc: 'Last bought 55 days ago · Replenishment predicted in ~5 days'
                      },
                      chilli: {
                        brand: 'SPICE GOLD',
                        name: 'Red Chilli Powder (200g)',
                        price: '₹60',
                        desc: 'Fiery red chilli powder.',
                        img: 'https://images.unsplash.com/photo-1596647466249-16060f64c6dc?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '2%',
                        stock: '30',
                        cycleTitle: 'You usually buy this every 40 days.',
                        cycleDesc: 'Last bought 35 days ago · Replenishment predicted in ~5 days'
                      },
                      garam_masala: {
                        brand: 'SPICE GOLD',
                        name: 'Garam Masala (100g)',
                        price: '₹75',
                        desc: 'Authentic blend of whole spices.',
                        img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '4%',
                        stock: '15',
                        cycleTitle: 'You usually buy this every 90 days.',
                        cycleDesc: 'Last bought 85 days ago · Replenishment predicted in ~5 days'
                      },
                      pepper: {
                        brand: 'SPICE GOLD',
                        name: 'Black Pepper (50g)',
                        price: '₹50',
                        desc: 'Freshly ground black pepper.',
                        img: 'https://images.unsplash.com/photo-1508254627318-7a55c2bf31b7?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '1%',
                        stock: '40',
                        cycleTitle: 'You usually buy this every 120 days.',
                        cycleDesc: 'Last bought 115 days ago · Replenishment predicted in ~5 days'
                      },
                      tea: {
                        brand: 'MORNING BREW',
                        name: 'Assam Tea (500g)',
                        price: '₹220',
                        desc: 'Strong and aromatic Assam tea leaves.',
                        img: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '6%',
                        stock: '20',
                        cycleTitle: 'You usually buy this every 30 days.',
                        cycleDesc: 'Last bought 28 days ago · Replenishment predicted in ~2 days'
                      },
                      coffee: {
                        brand: 'CAFE ROAST',
                        name: 'Instant Coffee (100g)',
                        price: '₹150',
                        desc: 'Rich instant coffee.',
                        img: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '8%',
                        stock: '10',
                        cycleTitle: 'You usually buy this every 25 days.',
                        cycleDesc: 'Last bought 24 days ago · Replenishment predicted in ~1 day'
                      },
                      biscuits: {
                        brand: 'CRUNCHY',
                        name: 'Digestive Biscuits (250g)',
                        price: '₹40',
                        desc: 'Healthy digestive cookies.',
                        img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '15%',
                        stock: '5',
                        cycleTitle: 'You usually buy this every 10 days.',
                        cycleDesc: 'Last bought 9 days ago · Replenishment predicted in ~1 day'
                      },
                      oats: {
                        brand: 'HEALTHY START',
                        name: 'Rolled Oats (1kg)',
                        price: '₹180',
                        desc: 'High fiber rolled oats.',
                        img: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '5%',
                        stock: '22',
                        cycleTitle: 'You usually buy this every 20 days.',
                        cycleDesc: 'Last bought 15 days ago · Replenishment predicted in ~5 days'
                      },
                      cheese: {
                        brand: 'DAIRY BEST',
                        name: 'Cheddar Cheese (200g)',
                        price: '₹110',
                        desc: 'Aged cheddar cheese block.',
                        img: 'https://images.unsplash.com/photo-1618164421711-20d0f41ceaf3?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '9%',
                        stock: '18',
                        cycleTitle: 'You usually buy this every 14 days.',
                        cycleDesc: 'Last bought 12 days ago · Replenishment predicted in ~2 days'
                      },
                      butter: {
                        brand: 'FRESH CO-OP DAIRY',
                        name: 'Salted Butter (500g)',
                        price: '₹260',
                        desc: 'Creamy salted butter.',
                        img: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '11%',
                        stock: '15',
                        cycleTitle: 'You usually buy this every 20 days.',
                        cycleDesc: 'Last bought 18 days ago · Replenishment predicted in ~2 days'
                      },
                      ravva: {
                        brand: 'PREMIUM AGRI',
                        name: 'Bombay Ravva (1kg)',
                        price: '₹50',
                        desc: 'Fine semolina for perfect upma.',
                        img: 'https://images.unsplash.com/photo-1626804475297-41609ea264eb?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '4%',
                        stock: '30',
                        cycleTitle: 'You usually buy this every 30 days.',
                        cycleDesc: 'Last bought 25 days ago · Replenishment predicted in ~5 days'
                      }
"""

content = content.replace('sugar: {', new_mock_products + ',\nsugar: {')

# 3. Add new HTML items right after tomatoes
new_html_items = """
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('oil')">
            <div class="item-img">🛢️</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Refined Sunflower Oil (1L)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 20 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('ghee')">
            <div class="item-img">🧈</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Pure Desi Ghee (500ml)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 45 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('daal')">
            <div class="item-img">🍲</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Toor Daal (1kg)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 15 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('turmeric')">
            <div class="item-img">🌟</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Turmeric Powder (200g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 60 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('chilli')">
            <div class="item-img">🌶️</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Red Chilli Powder (200g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 40 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('garam_masala')">
            <div class="item-img">🥘</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Garam Masala (100g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 90 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('pepper')">
            <div class="item-img">🧂</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Black Pepper (50g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 120 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('tea')">
            <div class="item-img">☕</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Assam Tea (500g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 30 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('coffee')">
            <div class="item-img">☕</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Instant Coffee (100g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 25 days</span>
                <span class="badge red"><span style="width: 4px; height: 4px; background: var(--accent-red); border-radius: 50%; margin-right: 4px;"></span> Low Stock</span>
              </div>
            </div>
            <button class="btn-icon" style="background: var(--primary-dark); color: white;"><i data-lucide="zap" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('biscuits')">
            <div class="item-img">🍪</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Digestive Biscuits (250g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 10 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('oats')">
            <div class="item-img">🥣</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Rolled Oats (1kg)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 20 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('cheese')">
            <div class="item-img">🧀</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Cheddar Cheese (200g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 14 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer;" onclick="loadProduct('butter')">
            <div class="item-img">🧈</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Salted Butter (500g)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 20 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
          
          <div class="item-row" style="cursor: pointer; padding-bottom: 0;" onclick="loadProduct('ravva')">
            <div class="item-img">🍚</div>
            <div style="flex: 1;">
              <div class="font-semibold text-sm mb-1">Bombay Ravva (1kg)</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Cycle: 30 days</span>
                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
              </div>
            </div>
            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
          </div>
"""

tomatoes_html_end = 'Fresh Farm Tomatoes (1kg)</div>\\n              <div class="flex items-center gap-2">\\n                <span class="text-xs text-muted">Cycle: 4 days</span>\\n                <span class="badge"><span\\n                    style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span>\\n                  Available</span>\\n              </div>\\n            </div>\\n            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>\\n          </div>'
content = re.sub(r'<div class="item-row" style="padding-bottom: 0;">\s*<div class="item-img">🍅</div>.*?</button>\s*</div>', 
                 '<div class="item-row" style="cursor: pointer;" onclick="loadProduct(\'tomatoes\')">\n            <div class="item-img">🍅</div>\n            <div style="flex: 1;">\n              <div class="font-semibold text-sm mb-1">Fresh Farm Tomatoes (1kg)</div>\n              <div class="flex items-center gap-2">\n                <span class="text-xs text-muted">Cycle: 4 days</span>\n                <span class="badge"><span\n                    style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span>\n                  Available</span>\n              </div>\n            </div>\n            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>\n          </div>\n' + new_html_items, 
                 content, flags=re.DOTALL)

# Update "6 Items Due" to "20 Items Due"
content = content.replace('6 Items Due', '20 Items Due')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
