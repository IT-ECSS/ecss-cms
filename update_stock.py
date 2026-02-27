import requests
import json

# WooCommerce credentials
consumer_key = "ck_be13c98c45319d20fe95e9d3c49a7c56c74"
consumer_secret = "cs_a929e37fca8aa169a3e57196f8a9a23cb4d"

# Base URL
base_url = "https://ecss.org.sg/wp-json/wc/v3"

# Create auth
auth = (consumer_key, consumer_secret)

# Update CT Hub Yellow (ID 16026) stock_quantity to 0
print("Updating CT Hub Yellow (ID 16026) stock_quantity to 0...")
url = f"{base_url}/products/16026"
data = {
    "stock_quantity": 0
}
response = requests.put(url, json=data, auth=auth)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print(f"stock_quantity: {result.get('stock_quantity')}")
    print(f"parent_stock_quantity: {result.get('parent_stock_quantity')}")
else:
    print(f"Error: {response.text}")

print("\n" + "="*50 + "\n")

# Update CT Hub Red (ID 16028) stock_quantity to 0
print("Updating CT Hub Red (ID 16028) stock_quantity to 0...")
url = f"{base_url}/products/16028"
data = {
    "stock_quantity": 0
}
response = requests.put(url, json=data, auth=auth)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print(f"stock_quantity: {result.get('stock_quantity')}")
    print(f"parent_stock_quantity: {result.get('parent_stock_quantity')}")
else:
    print(f"Error: {response.text}")
