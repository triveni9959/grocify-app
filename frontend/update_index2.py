import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_mock_products = """
                      tomatoes: {
                        brand: 'LOCAL FARM',
                        name: 'Fresh Farm Tomatoes (1kg)',
                        price: '₹40',
                        desc: 'Fresh and juicy tomatoes directly from the farm.',
                        img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '6%',
                        stock: '35',
                        cycleTitle: 'You usually buy this every 4 days.',
                        cycleDesc: 'Last bought 3 days ago · Replenishment predicted in ~1 day'
                      },
                      eggs: {
                        brand: 'FARM FRESH',
                        name: 'Organic Free-Range Eggs (6 pcs)',
                        price: '₹60',
                        desc: 'Healthy, organic free-range eggs.',
                        img: 'https://images.unsplash.com/photo-1598965402089-897ce52e8355?auto=format&fit=crop&w=200&q=80',
                        demandTrend: '9%',
                        stock: '24',
                        cycleTitle: 'You usually buy this every 9 days.',
                        cycleDesc: 'Last bought 5 days ago · Replenishment predicted in ~4 days'
                      },
"""

content = content.replace('bread: {', new_mock_products + 'bread: {')

content = content.replace(
    '<div class="item-row">\n            <div class="item-img">🥚</div>',
    '<div class="item-row" style="cursor: pointer;" onclick="loadProduct(\'eggs\')">\n            <div class="item-img">🥚</div>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
