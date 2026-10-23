import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add cart icon
cart_icon_html = """
          <div style="position: relative; cursor: pointer;" onclick="showView('cart')">
            <i data-lucide="shopping-bag" style="width: 20px;"></i>
            <span id="cart-badge" style="position: absolute; top: -5px; right: -5px; background: var(--accent-red); color: white; border-radius: 50%; padding: 2px 5px; font-size: 8px; font-weight: bold; display: none;">0</span>
          </div>
"""
content = content.replace('<i data-lucide="bell" style="width: 20px;"></i>', cart_icon_html + '          <i data-lucide="bell" style="width: 20px;"></i>')

# 2. Update Add to Basket button
add_btn_target = '<button class="btn" style="flex: 1; background: #0a3a2a; color: white;">\n              <i data-lucide="shopping-bag" style="width: 16px; margin-right: 8px;"></i> Add to basket — ₹30\n            </button>'
add_btn_replacement = '<button class="btn" id="add-to-basket-btn" style="flex: 1; background: #0a3a2a; color: white;" onclick="addToBasket()">\n              <i data-lucide="shopping-bag" style="width: 16px; margin-right: 8px;"></i> <span id="add-to-basket-text">Add to basket — ₹30</span>\n            </button>'
content = content.replace(add_btn_target, add_btn_replacement)

# 3. Add view-cart
view_cart_html = """
      <!-- CART VIEW -->
      <div id="view-cart" style="display: none; background: #f8fafc; min-height: 100vh; padding-bottom: 120px;">
        <div class="header" style="background: white; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 16px;">
          <button class="btn-icon" onclick="showView('customer')" style="background: transparent;"><i data-lucide="arrow-left" style="width: 20px;"></i></button>
          <div class="font-bold text-lg">Your Basket</div>
          <div style="width: 36px;"></div> <!-- Spacer -->
        </div>

        <div class="p-4" id="cart-items-container">
          <!-- Dynamically populated by JS -->
          <div style="text-align: center; color: var(--text-muted); margin-top: 40px;">Your basket is empty.</div>
        </div>

        <!-- Sticky Bottom Bar -->
        <div style="position: fixed; bottom: 0; width: 100%; max-width: 400px; background: white; border-top: 1px solid var(--border-color); padding: 16px; z-index: 100; box-shadow: 0 -4px 12px rgba(0,0,0,0.05);">
          <div class="flex justify-between items-center mb-4">
            <span style="font-weight: 600; color: var(--text-muted);">Total Bill</span>
            <span style="font-size: 24px; font-weight: 800; color: var(--text-main);" id="cart-total-bill">₹0</span>
          </div>
          <button class="btn-primary w-full justify-center" style="padding: 14px; font-size: 16px; font-weight: bold;">Proceed to Checkout</button>
        </div>
      </div>
"""
content = content.replace('<!-- PATTERN VIEW -->', view_cart_html + '\n      <!-- PATTERN VIEW -->')

# 4. Add JS logic
js_logic = """
                    // Basket Logic
                    let basket = [];
                    let currentProduct = null;

                    function addToBasket() {
                      if (!currentProduct) return;
                      // parse price from '₹30'
                      let priceStr = currentProduct.price.replace(/[^0-9]/g, '');
                      let price = parseInt(priceStr);
                      basket.push({
                        name: currentProduct.name,
                        price: price,
                        img: currentProduct.img
                      });
                      updateCartUI();
                      
                      // visual feedback
                      let btn = document.getElementById('add-to-basket-btn');
                      let oldHtml = btn.innerHTML;
                      btn.innerHTML = '<i data-lucide="check" style="width: 16px; margin-right: 8px;"></i> Added!';
                      btn.style.background = 'var(--primary-dark)';
                      lucide.createIcons();
                      setTimeout(() => {
                        btn.innerHTML = oldHtml;
                        lucide.createIcons();
                      }, 1000);
                    }

                    function updateCartUI() {
                      let badge = document.getElementById('cart-badge');
                      if (badge) {
                        if (basket.length > 0) {
                          badge.style.display = 'block';
                          badge.innerText = basket.length;
                        } else {
                          badge.style.display = 'none';
                        }
                      }
                      
                      let container = document.getElementById('cart-items-container');
                      let totalEl = document.getElementById('cart-total-bill');
                      if (!container || !totalEl) return;
                      
                      if (basket.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 40px;">Your basket is empty.</div>';
                        totalEl.innerText = '₹0';
                        return;
                      }
                      
                      let html = '';
                      let total = 0;
                      basket.forEach((item, index) => {
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
                      });
                      container.innerHTML = html;
                      totalEl.innerText = '₹' + total;
                    }
"""
content = content.replace('function loadProduct(id) {', js_logic + '\n                    function loadProduct(id) {')

# 5. Modify loadProduct to track currentProduct and update add-to-basket button
load_product_patch = """
                      currentProduct = p;
                      const addBtnText = document.getElementById('add-to-basket-text');
                      if (addBtnText) addBtnText.innerText = 'Add to basket — ' + p.price;
"""
content = content.replace("document.getElementById('product-img').src = p.img;", "document.getElementById('product-img').src = p.img;" + load_product_patch)

# 6. Add 'cart' to views list
content = content.replace("const views = ['landing'", "const views = ['cart', 'landing'")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
