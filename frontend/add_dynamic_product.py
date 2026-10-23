import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ID to the container
target_container = '<div class="card" style="padding: 12px;">'
replacement_container = '<div class="card" style="padding: 12px;" id="customer-products-list">'
content = content.replace(target_container, replacement_container, 1)

# 2. Update submitNewProduct function
target_js = """
                      btn.innerHTML = '<i data-lucide="check" style="width: 18px; margin-right: 8px;"></i> Successfully Added!';
                      btn.style.background = '#059669'; // success green
                      lucide.createIcons();

                      setTimeout(() => {
                        btn.innerHTML = oldHtml;
                        btn.style.background = '';
                        document.getElementById('add-prod-name').value = '';
                        document.getElementById('add-prod-price').value = '';
                        document.getElementById('add-prod-qty').value = '';
                        document.getElementById('add-prod-expiry').value = '';
                        lucide.createIcons();
                        showView('merchant');
                      }, 1500);
"""

new_js = """
                      let price = document.getElementById('add-prod-price').value;
                      let qty = document.getElementById('add-prod-qty').value;
                      
                      // Create dynamic ID
                      let newId = 'custom_' + Date.now();
                      
                      // Add to mockProducts
                      mockProducts[newId] = {
                        brand: 'NEW ITEM',
                        name: name,
                        price: '₹' + (price || '100'),
                        desc: 'Recently added item to inventory.',
                        img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
                        demandTrend: 'NEW',
                        stock: qty || '10',
                        cycleTitle: 'Newly available at your store.',
                        cycleDesc: 'Added just now by shopkeeper'
                      };
                      
                      // Add to customer list UI
                      let list = document.getElementById('customer-products-list');
                      if (list) {
                        let newItemHtml = `
                          <div class="item-row" style="cursor: pointer; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; padding: 12px;" onclick="loadProduct('${newId}')">
                            <div class="item-img" style="background: white;">🆕</div>
                            <div style="flex: 1;">
                              <div class="font-semibold text-sm mb-1">${name} <span class="badge" style="background: #10b981; color: white; font-size: 8px; padding: 2px 4px; margin-left: 4px;">NEW</span></div>
                              <div class="flex items-center gap-2">
                                <span class="text-xs text-muted">Just added</span>
                                <span class="badge"><span style="width: 4px; height: 4px; background: var(--primary-dark); border-radius: 50%; margin-right: 4px;"></span> Available</span>
                              </div>
                            </div>
                            <button class="btn-icon"><i data-lucide="bookmark" style="width: 16px;"></i></button>
                          </div>
                        `;
                        // Insert at the top of the list
                        list.insertAdjacentHTML('afterbegin', newItemHtml);
                      }

                      btn.innerHTML = '<i data-lucide="check" style="width: 18px; margin-right: 8px;"></i> Successfully Added!';
                      btn.style.background = '#059669'; // success green
                      lucide.createIcons();

                      setTimeout(() => {
                        btn.innerHTML = oldHtml;
                        btn.style.background = '';
                        document.getElementById('add-prod-name').value = '';
                        document.getElementById('add-prod-price').value = '';
                        document.getElementById('add-prod-qty').value = '';
                        document.getElementById('add-prod-expiry').value = '';
                        lucide.createIcons();
                        showView('merchant'); // return to merchant
                      }, 1500);
"""
content = content.replace(target_js, new_js)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
