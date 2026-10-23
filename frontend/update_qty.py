import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Product Detail page +/- buttons
target_minus_btn = """<button class="btn-icon"
                style="background: transparent; width: 36px; height: 36px; border-radius: 8px 0 0 8px;"><i
                  data-lucide="minus" style="width: 14px;"></i></button>"""
target_qty = """<div style="width: 24px; text-align: center; font-weight: 600;">1</div>"""
target_plus_btn = """<button class="btn-icon"
                style="background: transparent; width: 36px; height: 36px; border-radius: 0 8px 8px 0;"><i
                  data-lucide="plus" style="width: 14px;"></i></button>"""

replacement_minus_btn = """<button class="btn-icon" onclick="changeQuantity(-1)"
                style="background: transparent; width: 36px; height: 36px; border-radius: 8px 0 0 8px;"><i
                  data-lucide="minus" style="width: 14px;"></i></button>"""
replacement_qty = """<div id="product-quantity" style="width: 24px; text-align: center; font-weight: 600;">1</div>"""
replacement_plus_btn = """<button class="btn-icon" onclick="changeQuantity(1)"
                style="background: transparent; width: 36px; height: 36px; border-radius: 0 8px 8px 0;"><i
                  data-lucide="plus" style="width: 14px;"></i></button>"""

content = content.replace(target_minus_btn, replacement_minus_btn)
content = content.replace(target_qty, replacement_qty)
content = content.replace(target_plus_btn, replacement_plus_btn)


# 2. Update basket JS logic
js_target = """                    let basket = [];
                    let currentProduct = null;

                    function addToBasket() {"""

js_replacement = """                    let basket = [];
                    let currentProduct = null;
                    let currentQuantity = 1;

                    function changeQuantity(change) {
                      if (currentQuantity + change >= 1) {
                        currentQuantity += change;
                        document.getElementById('product-quantity').innerText = currentQuantity;
                        
                        if (currentProduct) {
                          let priceStr = currentProduct.price.replace(/[^0-9]/g, '');
                          let basePrice = parseInt(priceStr);
                          let addBtnText = document.getElementById('add-to-basket-text');
                          if (addBtnText) addBtnText.innerText = 'Add to basket — ₹' + (basePrice * currentQuantity);
                        }
                      }
                    }

                    function updateCartItemQuantity(index, change) {
                      if (basket[index].quantity + change >= 1) {
                        basket[index].quantity += change;
                      } else if (basket[index].quantity + change === 0) {
                        basket.splice(index, 1);
                      }
                      updateCartUI();
                      lucide.createIcons();
                    }

                    function addToBasket() {"""

content = content.replace(js_target, js_replacement)


# 3. Update addToBasket to push quantity
add_to_basket_target = """                      basket.push({
                        name: currentProduct.name,
                        price: price,
                        img: currentProduct.img
                      });"""

add_to_basket_replacement = """                      
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
                      
                      // Reset quantity for next time
                      currentQuantity = 1;
                      document.getElementById('product-quantity').innerText = currentQuantity;
                      let addBtnText = document.getElementById('add-to-basket-text');
                      if (addBtnText) addBtnText.innerText = 'Add to basket — ₹' + price;
"""
content = content.replace(add_to_basket_target, add_to_basket_replacement)


# 4. Update cart UI html generation to show quantity + buttons
cart_ui_target = """                      basket.forEach((item, index) => {
                        total += item.price;
                        html += `
                          <div class="card p-3 mb-3" style="background: white; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <img src="${item.img}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="flex: 1;">
                              <div style="font-weight: 600; font-size: 14px;">${item.name}</div>
                              <div style="color: var(--primary-dark); font-weight: bold;">₹${item.price}</div>
                            </div>
                          </div>
                        `;
                      });"""

cart_ui_replacement = """                      basket.forEach((item, index) => {
                        total += (item.price * item.quantity);
                        html += `
                          <div class="card p-3 mb-3" style="background: white; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <img src="${item.img}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="flex: 1;">
                              <div style="font-weight: 600; font-size: 14px; line-height: 1.2; margin-bottom: 4px;">${item.name}</div>
                              <div style="color: var(--primary-dark); font-weight: bold; font-size: 14px;">₹${item.price * item.quantity}</div>
                            </div>
                            <div class="flex items-center" style="border: 1px solid var(--border-color); border-radius: 8px; background: #f8fafc;">
                              <button class="btn-icon" onclick="updateCartItemQuantity(${index}, -1)" style="background: transparent; width: 32px; height: 32px; border-radius: 8px 0 0 8px;"><i data-lucide="minus" style="width: 14px;"></i></button>
                              <div style="width: 20px; text-align: center; font-weight: 700; font-size: 13px;">${item.quantity}</div>
                              <button class="btn-icon" onclick="updateCartItemQuantity(${index}, 1)" style="background: transparent; width: 32px; height: 32px; border-radius: 0 8px 8px 0;"><i data-lucide="plus" style="width: 14px;"></i></button>
                            </div>
                          </div>
                        `;
                      });"""
content = content.replace(cart_ui_target, cart_ui_replacement)


# 5. Reset product quantity when loading a new product
load_product_patch = """                      currentQuantity = 1;
                      document.getElementById('product-quantity').innerText = currentQuantity;
                      const addBtnText = document.getElementById('add-to-basket-text');
                      if (addBtnText) addBtnText.innerText = 'Add to basket — ₹' + p.price.replace(/[^0-9]/g, '');
"""
content = content.replace("currentProduct = p;\n                      const addBtnText = document.getElementById('add-to-basket-text');\n                      if (addBtnText) addBtnText.innerText = 'Add to basket — ' + p.price;", "currentProduct = p;\n" + load_product_patch)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
