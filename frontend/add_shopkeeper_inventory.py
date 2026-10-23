import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add "Add New Product" button in view-shopkeeper.
target_btn_insertion = "<!-- Priorities Section -->"
add_btn_html = """
          <!-- Manage Inventory Action -->
          <div class="card p-4 mb-6 text-center" style="background: var(--primary-dark); color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="showView('shopkeeper-add')">
            <i data-lucide="plus-circle" style="width: 24px; margin-bottom: 8px;"></i>
            <div style="font-weight: 700; font-size: 16px;">Add New Product</div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">Update quality, expiry & pricing</div>
          </div>
          
"""
content = content.replace(target_btn_insertion, add_btn_html + target_btn_insertion)

# 2. Add the `view-shopkeeper-add` HTML.
shopkeeper_add_html = """
      <!-- SHOPKEEPER ADD PRODUCT VIEW -->
      <div id="view-shopkeeper-add" style="display: none; background: #f8fafc; min-height: 100vh; padding-bottom: 80px;">
        <div class="header" style="background: white; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 16px;">
          <button class="btn-icon" onclick="showView('shopkeeper')" style="background: transparent;"><i data-lucide="arrow-left" style="width: 20px;"></i></button>
          <div class="font-bold text-lg">Add Product</div>
          <div style="width: 36px;"></div> <!-- Spacer -->
        </div>

        <div class="p-4">
          <div class="card p-4 mb-4" style="background: white;">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Product Name</label>
              <input type="text" id="add-prod-name" placeholder="e.g. Organic Tomatoes" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Price (₹)</label>
              <input type="number" id="add-prod-price" placeholder="40" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Quality Grade</label>
              <select id="add-prod-quality" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: white;">
                <option value="premium">Premium / Farm Fresh</option>
                <option value="standard">Standard</option>
                <option value="discounted">Discounted (Close to Expiry)</option>
              </select>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Expiry Date / Best Before</label>
              <input type="date" id="add-prod-expiry" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Available Quantity (Units)</label>
              <input type="number" id="add-prod-qty" placeholder="50" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
            </div>
          </div>
          
          <button class="btn-primary w-full justify-center" onclick="submitNewProduct(event)" style="padding: 14px; font-size: 16px; font-weight: bold;">
            <i data-lucide="save" style="width: 18px; margin-right: 8px;"></i> Save Product to Inventory
          </button>
        </div>
      </div>
"""
content = content.replace('<!-- PATTERN VIEW -->', shopkeeper_add_html + '\n      <!-- PATTERN VIEW -->')

# 3. Add JS function submitNewProduct
js_logic = """
                    function submitNewProduct(event) {
                      const btn = event.currentTarget;
                      const oldHtml = btn.innerHTML;
                      
                      // Mock validation
                      let name = document.getElementById('add-prod-name').value;
                      if(!name) {
                        alert("Please enter a product name.");
                        return;
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
                        showView('shopkeeper');
                      }, 1500);
                    }
"""
content = content.replace('// View switching logic', js_logic + '\n                    // View switching logic')

# 4. Add 'shopkeeper-add' to views list
content = content.replace("const views = ['cart', 'landing'", "const views = ['shopkeeper-add', 'cart', 'landing'")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
