import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

floating_cart_html = """
    <!-- Floating View Basket Button -->
    <div id="floating-cart" onclick="showView('cart')" style="display: none; position: fixed; bottom: 80px; right: 20px; z-index: 9999; background: var(--primary-dark); color: white; padding: 12px 20px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; align-items: center; gap: 10px;">
      <i data-lucide="shopping-bag" style="width: 18px;"></i>
      <span style="font-weight: bold; font-size: 14px;">View Basket</span>
      <div style="background: white; color: var(--primary-dark); font-weight: bold; border-radius: 12px; padding: 2px 8px; font-size: 12px;" id="floating-cart-count">0</div>
    </div>
"""

# Insert right after <body>
content = content.replace('<body>', '<body>' + floating_cart_html)

# Update updateCartUI() to show/hide and update the floating cart
js_patch_target = """
                      let html = '';
                      let total = 0;
"""

js_patch_replacement = """
                      let floatingCart = document.getElementById('floating-cart');
                      let floatingCount = document.getElementById('floating-cart-count');
                      if (floatingCart && floatingCount) {
                        if (basket.length > 0) {
                          floatingCart.style.display = 'flex';
                          floatingCount.innerText = basket.length;
                        } else {
                          floatingCart.style.display = 'none';
                        }
                      }

                      let html = '';
                      let total = 0;
"""

content = content.replace(js_patch_target, js_patch_replacement)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
