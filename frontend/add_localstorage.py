import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update submitNewProduct to save to localStorage
target_js = """                      // Add to customer list UI
                      let list = document.getElementById('customer-products-list');"""

replacement_js = """                      // Save to localStorage
                      let stored = JSON.parse(localStorage.getItem('addedProducts') || '[]');
                      stored.push({id: newId, data: mockProducts[newId]});
                      localStorage.setItem('addedProducts', JSON.stringify(stored));

                      // Add to customer list UI
                      let list = document.getElementById('customer-products-list');"""
content = content.replace(target_js, replacement_js)


# 2. Add initialization logic to load from localStorage on page load
init_js = """
                    // Load added products from localStorage
                    function loadStoredProducts() {
                      let stored = JSON.parse(localStorage.getItem('addedProducts') || '[]');
                      let list = document.getElementById('customer-products-list');
                      
                      stored.forEach(item => {
                        // Add to mockProducts
                        mockProducts[item.id] = item.data;
                        
                        // Add to UI
                        if (list) {
                          let newItemHtml = `
                            <div class="item-row" style="cursor: pointer; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; padding: 12px;" onclick="loadProduct('${item.id}')">
                              <div class="item-img" style="background: white;">🆕</div>
                              <div style="flex: 1;">
                                <div class="font-semibold text-sm mb-1">${item.data.name} <span class="badge" style="background: #10b981; color: white; font-size: 8px; padding: 2px 4px; margin-left: 4px;">NEW</span></div>
                                <div class="flex items-center gap-2">
                                  <span class="text-xs text-muted">Just added</span>
                                  <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
                                </div>
                              </div>
                              <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
                            </div>
                          `;
                          list.insertAdjacentHTML('afterbegin', newItemHtml);
                        }
                      });
                    }
                    
                    // Run immediately to populate DOM
                    setTimeout(() => { loadStoredProducts(); }, 100);
"""

content = content.replace('// Basket Logic', init_js + '\n                    // Basket Logic')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
