import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Track currentProductId
target_load_prod = """
                      currentProduct = p;
                      currentQuantity = 1;"""

replacement_load_prod = """
                      currentProduct = p;
                      currentProductId = id;
                      currentQuantity = 1;"""
content = content.replace(target_load_prod, replacement_load_prod)

# Need to declare `currentProductId` globally. We can put it near `currentProduct = null;`
target_vars = """                    let currentProduct = null;
                    let currentQuantity = 1;"""
replacement_vars = """                    let currentProduct = null;
                    let currentProductId = null;
                    let currentQuantity = 1;"""
content = content.replace(target_vars, replacement_vars)

# 2. Update addToBasket to decrement stock and change purchase pattern
target_add = """                      
                      // check if already in basket
                      let existing = basket.find(item => item.name === currentProduct.name);
                      if (existing) {
                        existing.quantity += currentQuantity;
                      } else {
                        basket.push({
                          name: currentProduct.name,
                          price: price,
                          img: currentProduct.img,
                          quantity: currentQuantity
                        });
                      }
                      
                      // Reset quantity for next time"""

replacement_add = """                      
                      // check if already in basket
                      let existing = basket.find(item => item.name === currentProduct.name);
                      if (existing) {
                        existing.quantity += currentQuantity;
                      } else {
                        basket.push({
                          id: currentProductId,
                          name: currentProduct.name,
                          price: price,
                          img: currentProduct.img,
                          quantity: currentQuantity
                        });
                      }
                      
                      // DECREMENT STOCK AND UPDATE PATTERN DATA INSTANTLY
                      if (currentProductId && mockProducts[currentProductId]) {
                        let currentStock = parseInt(mockProducts[currentProductId].stock) || 0;
                        let newStock = Math.max(0, currentStock - currentQuantity);
                        mockProducts[currentProductId].stock = newStock.toString();
                        
                        mockProducts[currentProductId].cycleTitle = "Added to basket!";
                        mockProducts[currentProductId].cycleDesc = "Your purchase pattern will calibrate after checkout.";
                        
                        // Update UI immediately
                        let stockEl = document.getElementById('prod-stock');
                        if(stockEl) stockEl.innerText = newStock + ' Units';
                        let titleEl = document.getElementById('prod-cycle-title');
                        if(titleEl) titleEl.innerText = mockProducts[currentProductId].cycleTitle;
                        let descEl = document.getElementById('prod-cycle-desc');
                        if(descEl) descEl.innerText = mockProducts[currentProductId].cycleDesc;
                        
                        // Add some flash animation to stock text
                        if(stockEl) {
                           stockEl.style.color = '#ef4444';
                           setTimeout(() => stockEl.style.color = 'var(--text-main)', 1000);
                        }
                      }
                      
                      // Reset quantity for next time"""
content = content.replace(target_add, replacement_add)

# 3. Update updateCartItemQuantity to increment/decrement stock properly when +/- is clicked in cart
target_cart_qty = """                    function updateCartItemQuantity(index, change) {
                      if (basket[index].quantity + change >= 1) {
                        basket[index].quantity += change;
                      } else if (basket[index].quantity + change === 0) {
                        basket.splice(index, 1);
                      }
                      updateCartUI();
                      lucide.createIcons();
                    }"""

replacement_cart_qty = """                    function updateCartItemQuantity(index, change) {
                      let item = basket[index];
                      let pId = item.id;
                      
                      if (item.quantity + change >= 1) {
                        item.quantity += change;
                        // update stock back in mockProducts
                        if (pId && mockProducts[pId]) {
                          let s = parseInt(mockProducts[pId].stock) || 0;
                          mockProducts[pId].stock = (s - change).toString();
                        }
                      } else if (item.quantity + change === 0) {
                        // return all stock
                        if (pId && mockProducts[pId]) {
                          let s = parseInt(mockProducts[pId].stock) || 0;
                          mockProducts[pId].stock = (s + item.quantity).toString();
                        }
                        basket.splice(index, 1);
                      }
                      updateCartUI();
                      lucide.createIcons();
                    }"""
content = content.replace(target_cart_qty, replacement_cart_qty)

# 4. In placeOrder(), permanently set the pattern to "Purchased Just Now"
target_place_order = """                        // clear basket
                        basket = [];"""
                        
replacement_place_order = """                        // update purchase pattern to purchased
                        basket.forEach(item => {
                           if(item.id && mockProducts[item.id]) {
                               mockProducts[item.id].cycleTitle = "Purchased just now!";
                               mockProducts[item.id].cycleDesc = "Your local store's inventory has been synced with this order.";
                           }
                        });
                        // clear basket
                        basket = [];"""
content = content.replace(target_place_order, replacement_place_order)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
