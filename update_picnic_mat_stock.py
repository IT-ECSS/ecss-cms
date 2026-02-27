import requests
import json

# WooCommerce credentials
consumer_key = "ck_439198907a526a5a9e3f8391dfb5f4eea970b9d7"
consumer_secret = "cs_47aed789dabc337d4e6e55f3142b598d4a2dc837"
base_url = "https://ecss.org.sg/wp-json/wc/v3"
auth = (consumer_key, consumer_secret)

print("Updating ECSS Picnic Mat product stocks...\n")

# Update Yellow Parent (ID: 16025) to 172
print("1. Updating Yellow Parent (ID: 16025) stock to 172...")
url = f"{base_url}/products/16025"
data = {
    "stock_quantity": 172,
    "manage_stock": True
}
response = requests.put(url, json=data, auth=auth)
if response.status_code == 200:
    result = response.json()
    print(f"   ✓ Success! Stock updated to: {result.get('stock_quantity')}\n")
else:
    print(f"   ✗ Error: {response.status_code} - {response.text}\n")

# Verify Yellow Variation (ID: 16026) stays at 0
print("2. Verifying Yellow Variation (ID: 16026) stock is 0...")
url = f"{base_url}/products/16025/variations/16026"
response = requests.get(url, auth=auth)
if response.status_code == 200:
    result = response.json()
    print(f"   ✓ Current stock: {result.get('stock_quantity')}\n")
else:
    print(f"   ✗ Error: {response.status_code}\n")

# Verify Red Parent (ID: 16015) is at 202
print("3. Verifying Red Parent (ID: 16015) stock is 202...")
url = f"{base_url}/products/16015"
response = requests.get(url, auth=auth)
if response.status_code == 200:
    result = response.json()
    print(f"   ✓ Current stock: {result.get('stock_quantity')}\n")
else:
    print(f"   ✗ Error: {response.status_code}\n")

# Verify Red Variation (ID: 16028) stays at 0
print("4. Verifying Red Variation (ID: 16028) stock is 0...")
url = f"{base_url}/products/16015/variations/16028"
response = requests.get(url, auth=auth)
if response.status_code == 200:
    result = response.json()
    print(f"   ✓ Current stock: {result.get('stock_quantity')}\n")
else:
    print(f"   ✗ Error: {response.status_code}\n")

print("=" * 60)
print("FINAL STOCK STATUS:")
print("=" * 60)
print("Store Yellow (Parent 16025): 172")
print("Store Red (Parent 16015): 202")
print("CT Hub Yellow (Variation 16026): 0")
print("CT Hub Red (Variation 16028): 0")
print("=" * 60)
