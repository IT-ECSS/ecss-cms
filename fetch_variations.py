import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangoPython.settings')
sys.path.insert(0, '/Users/moseslee/Desktop/ecss-cms')
django.setup()

from djangoPython.api.services import WooCommerceAPI

# Get WooCommerce API instance
woo_api = WooCommerceAPI()

# Fetch all inventory products
print("Fetching all inventory products with variations...\n")
products = woo_api.get_inventory_products()

# Organize by parent product
parent_products = {}

for product in products:
    if product.get('type') == 'variation':
        parent_id = product.get('parent_id')
        product_name = product.get('name')
        
        if parent_id not in parent_products:
            parent_products[parent_id] = {
                'name': product_name,
                'variations': []
            }
        
        variation_data = {
            'id': product.get('id'),
            'name': product.get('name'),
            'variation_name': product.get('variation_name'),
            'stock_quantity': product.get('stock_quantity'),
            'parent_stock_quantity': product.get('parent_stock_quantity'),
            'manage_stock': product.get('manage_stock'),
            'sku': product.get('sku'),
            'attributes': product.get('attributes', [])
        }
        parent_products[parent_id]['variations'].append(variation_data)

# Print organized data
print("=" * 80)
print("INVENTORY PRODUCTS WITH VARIATIONS")
print("=" * 80)

for parent_id, parent_data in sorted(parent_products.items()):
    print(f"\nParent Product ID: {parent_id}")
    print(f"Name: {parent_data['name']}")
    print(f"Variations ({len(parent_data['variations'])}):")
    print("-" * 80)
    
    for var in parent_data['variations']:
        print(f"  ID: {var['id']}")
        print(f"  Name: {var['name']}")
        print(f"  Variation Name (Location): {var['variation_name']}")
        print(f"  Stock Quantity: {var['stock_quantity']}")
        print(f"  Parent Stock Quantity: {var['parent_stock_quantity']}")
        print(f"  Manage Stock: {var['manage_stock']}")
        print(f"  SKU: {var['sku']}")
        print(f"  Attributes: {var['attributes']}")
        print()

# Save to JSON for easy reference
output_file = '/Users/moseslee/Desktop/ecss-cms/variations_list.json'
with open(output_file, 'w') as f:
    json.dump(parent_products, f, indent=2)

print("=" * 80)
print(f"\nVariations saved to: {output_file}")
