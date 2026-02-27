import requests
import json

# WooCommerce credentials
consumer_key = "ck_439198907a526a5a9e3f8391dfb5f4eea970b9d7"
consumer_secret = "cs_47aed789dabc337d4e6e55f3142b598d4a2dc837"
base_url = "https://ecss.org.sg/wp-json/wc/v3"
auth = (consumer_key, consumer_secret)

print("=" * 100)
print("FETCHING ALL INVENTORY PRODUCTS WITH VARIATIONS")
print("=" * 100)

# Get all products in Inventory category
page = 1
all_products = []
per_page = 100

while True:
    try:
        url = f"{base_url}/products"
        params = {
            'per_page': per_page,
            'page': page
        }
        
        response = requests.get(url, params=params, auth=auth, timeout=30)
        response.raise_for_status()
        
        products = response.json()
        if not products:
            break
        
        # Filter by Inventory category
        inventory_products = [
            p for p in products
            if 'categories' in p and any(cat.get('name') == 'Inventory' for cat in p['categories'])
            and p.get('type') == 'variable'
        ]
        
        all_products.extend(inventory_products)
        page += 1
    except Exception as e:
        print(f"Error fetching products: {e}")
        break

print(f"\nFound {len(all_products)} variable (parent) products in Inventory category\n")

# For each parent product, get its variations
parent_data = {}

for parent in all_products:
    parent_id = parent['id']
    parent_name = parent['name']
    parent_stock = parent.get('stock_quantity', 0)
    
    print(f"\nParent Product: {parent_name} (ID: {parent_id})")
    print(f"Parent Stock Quantity: {parent_stock}")
    print("Variations:")
    print("-" * 100)
    
    # Get variations for this parent
    var_page = 1
    variations = []
    
    while True:
        try:
            var_url = f"{base_url}/products/{parent_id}/variations"
            var_params = {
                'per_page': 100,
                'page': var_page
            }
            
            var_response = requests.get(var_url, params=var_params, auth=auth, timeout=30)
            var_response.raise_for_status()
            
            var_products = var_response.json()
            if not var_products:
                break
            
            variations.extend(var_products)
            var_page += 1
        except Exception as e:
            print(f"Error fetching variations for {parent_id}: {e}")
            break
    
    parent_data[parent_id] = {
        'name': parent_name,
        'stock_quantity': parent_stock,
        'variations': []
    }
    
    for var in variations:
        var_id = var['id']
        var_name = var.get('name', '')
        var_stock = var.get('stock_quantity', 0)
        manage_stock = var.get('manage_stock', False)
        
        attributes = var.get('attributes', [])
        location = ''
        if attributes:
            location = ', '.join([attr.get('option', '') for attr in attributes])
        
        parent_data[parent_id]['variations'].append({
            'id': var_id,
            'name': var_name,
            'location': location,
            'stock_quantity': var_stock,
            'manage_stock': manage_stock
        })
        
        print(f"  Variation ID: {var_id}")
        print(f"  Name: {var_name}")
        print(f"  Location: {location}")
        print(f"  Stock Quantity: {var_stock}")
        print(f"  Manage Stock: {manage_stock}")
        print()

# Save to JSON
output_file = '/Users/moseslee/Desktop/ecss-cms/all_variations.json'
with open(output_file, 'w') as f:
    json.dump(parent_data, f, indent=2)

print("=" * 100)
print(f"All variations saved to: {output_file}")
print("=" * 100)
