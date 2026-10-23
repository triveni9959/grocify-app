import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update "Proceed to Checkout" button
target_checkout_btn = '<button class="btn-primary w-full justify-center" style="padding: 14px; font-size: 16px; font-weight: bold;">Proceed to Checkout</button>'
replacement_checkout_btn = '<button class="btn-primary w-full justify-center" onclick="showCheckout()" style="padding: 14px; font-size: 16px; font-weight: bold;">Proceed to Checkout</button>'
content = content.replace(target_checkout_btn, replacement_checkout_btn)

# 2. Add checkout & success views
checkout_html = """
      <!-- CHECKOUT VIEW -->
      <div id="view-checkout" style="display: none; background: #f8fafc; min-height: 100vh; padding-bottom: 120px;">
        <div class="header" style="background: white; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 16px;">
          <button class="btn-icon" onclick="showView('cart')" style="background: transparent;"><i data-lucide="arrow-left" style="width: 20px;"></i></button>
          <div class="font-bold text-lg">Checkout</div>
          <div style="width: 36px;"></div> <!-- Spacer -->
        </div>

        <div class="p-4">
          <!-- Delivery Address -->
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Delivery Address</h3>
          <div class="card p-4 mb-6" style="background: white; border: 1px solid var(--primary-light);">
            <div class="flex justify-between items-start mb-2">
              <div class="font-bold text-sm flex items-center gap-2"><i data-lucide="map-pin" style="width: 14px; color: var(--primary-dark);"></i> Home</div>
              <div class="badge" style="background: #eef8f2; color: var(--primary-dark);">Default</div>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
              123/A, Green Valley Apartments, Near City Center,<br>
              Bangalore, Karnataka - 560001
            </p>
          </div>

          <!-- Payment Options -->
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Payment Options</h3>
          <div class="card p-0 mb-6" style="background: white; overflow: hidden;">
            <label class="flex items-center justify-between p-4 border-b border-gray-100" style="cursor: pointer;">
              <div class="flex items-center gap-3">
                <i data-lucide="smartphone" style="width: 20px; color: #10b981;"></i>
                <div style="font-size: 14px; font-weight: 600;">UPI (GPay, PhonePe, Paytm)</div>
              </div>
              <input type="radio" name="payment" checked style="width: 18px; height: 18px; accent-color: var(--primary-dark);">
            </label>
            <label class="flex items-center justify-between p-4 border-b border-gray-100" style="cursor: pointer;">
              <div class="flex items-center gap-3">
                <i data-lucide="credit-card" style="width: 20px; color: #3b82f6;"></i>
                <div style="font-size: 14px; font-weight: 600;">Credit / Debit Card</div>
              </div>
              <input type="radio" name="payment" style="width: 18px; height: 18px; accent-color: var(--primary-dark);">
            </label>
            <label class="flex items-center justify-between p-4" style="cursor: pointer;">
              <div class="flex items-center gap-3">
                <i data-lucide="banknote" style="width: 20px; color: #f59e0b;"></i>
                <div style="font-size: 14px; font-weight: 600;">Cash on Delivery (COD)</div>
              </div>
              <input type="radio" name="payment" style="width: 18px; height: 18px; accent-color: var(--primary-dark);">
            </label>
          </div>

          <!-- Order Summary -->
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Order Summary</h3>
          <div class="card p-4 mb-6" style="background: white;">
            <div class="flex justify-between items-center mb-2" style="font-size: 13px; color: var(--text-muted);">
              <span>Items Total</span>
              <span id="checkout-items-total">₹0</span>
            </div>
            <div class="flex justify-between items-center mb-2" style="font-size: 13px; color: var(--text-muted);">
              <span>Delivery Fee</span>
              <span style="color: #10b981; font-weight: bold;">FREE</span>
            </div>
            <div class="flex justify-between items-center pt-3 mt-3 border-t border-gray-100" style="font-size: 16px; font-weight: 800;">
              <span>To Pay</span>
              <span id="checkout-final-total">₹0</span>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Bar -->
        <div style="position: fixed; bottom: 0; width: 100%; max-width: 400px; background: white; border-top: 1px solid var(--border-color); padding: 16px; z-index: 100; box-shadow: 0 -4px 12px rgba(0,0,0,0.05);">
          <button class="btn-primary w-full justify-center" onclick="placeOrder(event)" style="padding: 16px; font-size: 16px; font-weight: bold; background: #0a3a2a;">
            <i data-lucide="check-circle" style="width: 18px; margin-right: 8px;"></i> Place Order & Pay
          </button>
        </div>
      </div>

      <!-- ORDER SUCCESS VIEW -->
      <div id="view-order-success" style="display: none; background: #0a3a2a; color: white; min-height: 100vh; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;">
        <div style="width: 80px; height: 80px; background: white; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
          <i data-lucide="check" style="width: 40px; height: 40px;"></i>
        </div>
        <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 12px; line-height: 1.2;">Order Placed Successfully!</h1>
        <p style="font-size: 14px; opacity: 0.8; margin-bottom: 40px; line-height: 1.5;">Your payment was processed and the store has received your order.</p>
        
        <div class="card w-full p-4 mb-8" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
          <div class="text-xs uppercase tracking-widest font-bold mb-1" style="opacity: 0.7;">Order ID</div>
          <div class="font-mono text-lg font-bold">#ORD-58932</div>
        </div>

        <button class="btn w-full justify-center mb-4" onclick="showView('customer')" style="background: white; color: #0a3a2a; padding: 16px; font-size: 16px; font-weight: bold;">
          Back to Dashboard
        </button>
      </div>
"""
content = content.replace('<!-- PATTERN VIEW -->', checkout_html + '\n      <!-- PATTERN VIEW -->')

# 3. Add JS functions
js_logic = """
                    function showCheckout() {
                      if (basket.length === 0) return;
                      let total = 0;
                      basket.forEach(i => total += (i.price * i.quantity));
                      document.getElementById('checkout-items-total').innerText = '₹' + total;
                      document.getElementById('checkout-final-total').innerText = '₹' + total;
                      showView('checkout');
                    }

                    function placeOrder(event) {
                      const btn = event.currentTarget;
                      const oldHtml = btn.innerHTML;
                      
                      btn.innerHTML = '<i data-lucide="loader" style="width: 18px; margin-right: 8px;"></i> Processing...';
                      btn.style.opacity = '0.8';
                      lucide.createIcons();

                      setTimeout(() => {
                        btn.innerHTML = oldHtml;
                        btn.style.opacity = '1';
                        // clear basket
                        basket = [];
                        updateCartUI();
                        document.getElementById('view-order-success').style.display = 'flex';
                        const views = ['landing', 'customer', 'merchant', 'shopkeeper', 'pattern', 'product', 'discover', 'calibration', 'inventory', 'decision', 'slow-moving', 'expiry', 'smart-offer', 'demand', 'simulator', 'learning', 'cart', 'shopkeeper-add', 'checkout', 'customer-login', 'shopkeeper-login'];
                        views.forEach(v => {
                          if(v !== 'order-success') {
                             let el = document.getElementById('view-' + v);
                             if(el) el.style.display = 'none';
                          }
                        });
                        window.scrollTo(0,0);
                        lucide.createIcons();
                      }, 2000);
                    }
"""
content = content.replace('// Basket Logic', js_logic + '\n                    // Basket Logic')

# 4. Add 'checkout' and 'order-success' to views list
content = content.replace("const views = ['shopkeeper-add', 'cart', 'landing'", "const views = ['checkout', 'order-success', 'shopkeeper-add', 'cart', 'landing'")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
