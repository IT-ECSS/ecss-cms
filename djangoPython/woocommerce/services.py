import requests
from django.conf import settings
import re
import unicodedata

def normalize_string(s):
    """
    Normalize strings for comparison by:
    1. Converting en-dashes, em-dashes to regular hyphens
    2. Removing extra whitespace
    3. Normalizing unicode characters
    """
    # Normalize unicode characters
    s = unicodedata.normalize('NFKD', s)
    # Replace en-dash (–) and em-dash (—) with regular hyphen
    s = s.replace('–', '-').replace('—', '-')
    # Strip whitespace
    s = s.strip()
    return s

class WooCommerceAPI:
    def __init__(self):
        self.base_url = settings.WOOCOMMERCE_API_URL
        self.auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)

    def get_nsa_products(self):
        all_products = []
        page = 1
        per_page = 100  # Maximum number of products per page for WooCommerce API

        while True:
            try:
                # Construct the API URL with pagination
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page
                }        
                # Make the API request
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Check for request errors

                # Parse the response as JSON
                products = response.json()
                if not products:
                    break  # Exit the loop if no products are returned
                # Filter products based on the criteria
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and len(product['categories']) == 2
                    and product['categories'][1].get('name') == 'Tri-Love Elderly: NSA'
                ]
                # Add filtered products to the list
                all_products.extend(filtered_products)
                # Increment page to fetch next set of products
                page += 1
            except requests.exceptions.RequestException as e:
                # Handle any errors during the request
                print(f"Error while fetching products: {e}")
                break
        return all_products
    
        all_products = []
        page = 1
        per_page = 100  # Maximum number of products per page for WooCommerce API

        while True:
            try:
                # Construct the API URL with pagination
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page
                }        
                # Make the API request
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Check for request errors

                # Parse the response as JSON
                products = response.json()
                if not products:
                    break  # Exit the loop if no products are returned
                # Filter products based on the criteria
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and len(product['categories']) == 2
                    and product['categories'][1].get('name') == 'Tri-Love Elderly: NSA'
                ]
                # Add filtered products to the list
                all_products.extend(filtered_products)
                # Increment page to fetch next set of products
                page += 1
            except requests.exceptions.RequestException as e:
                # Handle any errors during the request
                print(f"Error while fetching products: {e}")
                break
        return all_products

    def get_ilp_products(self):
        """Fetch and filter ILP products from WooCommerce."""
        all_products = []
        page = 1
        per_page = 100  # Maximum number of products per page for WooCommerce API

        while True:
            try:
                # Construct the API URL with pagination
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page
                }
                
                # Make the API request
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Check for request errors

                # Parse the response as JSON
                products = response.json()

                if not products:
                    break  # Exit the loop if no products are returned

                # Filter products based on the criteria for ILP
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and len(product['categories']) == 2
                    and product['categories'][1].get('name') == 'Tri-Love Elderly: ILP'
                ]

                # Add filtered products to the list
                all_products.extend(filtered_products)

                # Increment page to fetch next set of products
                page += 1

            except requests.exceptions.RequestException as e:
                # Handle any errors during the request
                print(f"Error while fetching products: {e}")
                break

        return all_products

    def getProductId(self, chinese, english, location):
        """Fetches the product ID by matching Chinese, English, and Location names from WooCommerce."""
        try:
            page = 1
            all_products = []  # List to store product id and name pairs
            per_page = 100  # Number of products to fetch per page
            matched_product_id = None  # Variable to store matched product ID
            
            # Normalize input parameters
            normalized_chinese = normalize_string(chinese)
            normalized_english = normalize_string(english)
            normalized_location = normalize_string(location)

            while True:
                # Fetch products for the current page
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page,
                }

                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Ensure we raise an error for bad requests

                products = response.json()  # Get products from the response

                # If no products are returned, break the loop
                if not products:
                    break

                # Check each product and split by <br/> or <br />
                for product in products:
                    product_name = product['name']
                    split_name = re.split(r'<br\s*/?>', product_name)

                    if len(split_name) == 3:
                        chinese_name = normalize_string(split_name[0])
                        english_name = normalize_string(split_name[1])
                        location_name = normalize_string(split_name[2])

                        # If the product matches the input chinese, english, and location, return the product ID
                        if chinese_name == normalized_chinese and english_name == normalized_english and location_name == normalized_location:
                            matched_product_id = product['id']
                            break  # Exit the loop if the product is found

                # If we found the matched product ID, stop fetching more pages
                if matched_product_id:
                    break

                page += 1  # Move to the next page

            # Return the matched product ID if found, otherwise None
            return {"id": matched_product_id, "exist": True}

        except requests.exceptions.RequestException as e:
            # Handle any errors during the request
            print(f"Error fetching products: {e}")
            return None

    def updateCourseQuantity(self, product_id, status):
        """
        Updates the product stock based on the product ID and the status.
        Handles all payment methods including SkillsFuture and refund scenarios.
        Arguments:
            - product_id: The ID of the product to update.
            - status: The status to update stock based on ("Cancelled", "Paid", "SkillsFuture Done", "Refunded", "Withdrawn", "To refund").
        """
        try:
            # Fetch current product details
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()

            product = response.json()
            print("Updating Product Stock:", status)

            # Get the current stock quantity
            original_stock_quantity = product.get("stock_quantity", 0)
            new_stock_quantity = original_stock_quantity  # Start with current stock
            print("Current Stock Quantity:", new_stock_quantity)

            # Parse short description to find "vacancy"
            short_description = product.get("short_description", "")
            array = short_description.split("<p>")
            if array and array[0] == '':
                array.pop(0)  # Remove empty first entry

            # Extract the number of vacancies directly within this function
            vacancies_text = next(
                (item.replace("\n", "").replace("<b>", "").replace("</b>", "")
                for item in array if "vacancy" in item.lower()),
                ""
            ).split("<br />")[-1].strip()
            vacancies_text = vacancies_text.replace("</p>", "").strip()        

            print("Vacancies Text:", vacancies_text)

            # Extract actual vacancies number using a regex directly in this function
            vacancies_match = re.search(r'(\d+)\s*Vacancies', vacancies_text)
            if vacancies_match:
                vacancies = int(vacancies_match.group(1))
            else:
                vacancies = 0  # Return 0 if no vacancies are found

            print("Actual Vacancies:", vacancies)

            print(f"Processing status: {status}")

            # **Stock Update Logic - Applies to all payment methods (Cash, PayNow, SkillsFuture)**
            # Refund statuses: restore vacancies (increase stock)
            # NOTE: "To refund" does NOT trigger updates - only actual refund/cancellation/withdrawal/method-change do
            if status in ["Cancelled", "Withdrawn", "Refunded", "Change of Final Payment Method"]:
                if new_stock_quantity < vacancies:  # Only increase stock if it is below vacancies
                    print("Increase stock by 1")
                    new_stock_quantity += 1
                else:
                    print("Stock is full, no increase.")  # Prevent increase beyond vacancies

            # Payment statuses: decrease vacancies (reduce stock) - applies to all payment methods
            elif status in ["Paid", "SkillsFuture Done", "Confirmed"]:
                if new_stock_quantity > 0:  # Only decrease if stock is greater than 0
                    print("Decrease stock by 1")
                    new_stock_quantity -= 1  
                else:
                    print("Stock is already 0, cannot decrease further.")  # Prevents negative stock
            else:
                print(f"Unhandled status: '{status}' - no stock update performed")

            print("Updated Stock Quantity:", new_stock_quantity)

            # Only update stock if it has changed
            if new_stock_quantity == original_stock_quantity:
                return {
                    'success': True,
                    'message': 'Stock unchanged',
                    'product_id': product_id,
                    'stock_quantity': new_stock_quantity,
                }

            update_data = {"stock_quantity": new_stock_quantity}
            update_response = requests.put(f"{settings.WOOCOMMERCE_API_URL}products/{product_id}",
                                            json=update_data, auth=self.auth)
            update_response.raise_for_status()

            return {
                'success': True,
                'message': 'Stock updated successfully',
                'product_id': product_id,
                'previous_stock': original_stock_quantity,
                'stock_quantity': new_stock_quantity,
            }

        except requests.exceptions.RequestException as e:
            print(f"Error updating product stock: {e}")
            return {
                'success': False,
                'error': f'WooCommerce request failed: {str(e)}',
                'product_id': product_id,
            }
        except Exception as e:
            print(f"Unexpected error updating product stock: {e}")
            return {
                'success': False,
                'error': str(e),
                'product_id': product_id,
            }

    def get_all_published_products(self):
        """Fetch all published products from WooCommerce without category filtering."""
        print("Fetching all published products from WooCommerce...")
        all_products = []
        page = 1
        per_page = 100

        while True:
            try:
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page,
                    'status': 'publish'
                }
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()

                products = response.json()
                if not products:
                    break

                all_products.extend(products)
                page += 1
            except requests.exceptions.RequestException as e:
                print(f"Error while fetching products: {e}")
                break
        return all_products

    def get_marriage_prep_products(self):
        print("Fetching Marriage Preparation Programme products from WooCommerce...")
        all_products = []
        page = 1
        per_page = 100  # Maximum number of products per page for WooCommerce API

        while True:
            try:
                # Construct the API URL with pagination
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page
                }
                # Make the API request
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Check for request errors

                # Parse the response as JSON
                products = response.json()
                if not products:
                    break  # Exit the loop if no products are returned
                # Filter products based on the criteria
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and len(product['categories']) == 2
                    and product['categories'][1].get('name') == 'MARRIAGE PREPARATION PROGRAMME'
                ]
                # Add filtered products to the list
                all_products.extend(filtered_products)
                # Increment page to fetch next set of products
                page += 1
            except requests.exceptions.RequestException as e:
                # Handle any errors during the request
                print(f"Error while fetching products: {e}")
                break
        return all_products

    def get_talks_and_seminar_products(self):
        """Fetch and filter Talks And Seminar products from WooCommerce."""
        print("Fetching Talks And Seminar products from WooCommerce...")
        all_products = []
        page = 1
        per_page = 100

        while True:
            try:
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page
                }
                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()

                products = response.json()
                if not products:
                    break
                # Filter products where first category is 'Talks And Seminar'
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and len(product['categories']) >= 1
                    and product['categories'][0].get('name') == 'Talks And Seminar'
                ]
                all_products.extend(filtered_products)
                page += 1
            except requests.exceptions.RequestException as e:
                print(f"Error while fetching products: {e}")
                break
        return all_products

    def reduce_stock(self, product_id, quantity_to_reduce):
        """Reduce stock quantity for a specific product in WooCommerce."""
        try:
            # First, get the current product data to retrieve current stock
            url = f"{self.base_url}products/{product_id}"
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()
            
            product_data = response.json()
            print(f"Current product data for ID {product_id}: {product_data}")
            
            # Get current stock quantity
            current_stock = product_data.get('stock_quantity', 0)
            if current_stock is None:
                current_stock = 0
            
            # Calculate new stock quantity
            new_stock = max(0, current_stock - quantity_to_reduce)  # Ensure stock doesn't go below 0
            # Update the product with new stock quantity
            update_data = {
                'stock_quantity': new_stock,
                'manage_stock': True  # Ensure stock management is enabled
            }
            
            response = requests.put(url, json=update_data, auth=self.auth)
            response.raise_for_status()
            
            updated_product = response.json()
            print(f"Stock update successful. New stock quantity: {updated_product.get('stock_quantity', 'N/A')}")
            
            return {
                'success': True,
                'previous_stock': current_stock,
                'new_stock': new_stock,
                'reduced_by': quantity_to_reduce
            }
            
        except requests.exceptions.RequestException as e:
            print(f"Error reducing stock for product {product_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            print(f"Unexpected error reducing stock: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def getProductIdByName(self, product_name):
        """Fetches the product ID by matching product name from WooCommerce."""
        try:
            page = 1
            per_page = 100  # Number of products to fetch per page
            matched_product_id = None  # Variable to store matched product ID
            
            # Normalize the search product name
            normalized_product_name = normalize_string(product_name)

            while True:
                # Fetch products for the current page
                url = f"{self.base_url}products"
                params = {
                    'per_page': per_page,
                    'page': page,
                }

                response = requests.get(url, params=params, auth=self.auth)
                response.raise_for_status()  # Ensure we raise an error for bad requests

                products = response.json()  # Get products from the response

                # If no products are returned, break the loop
                if not products:
                    break

                # Check each product for exact name match
                for product in products:
                    normalized_product = normalize_string(product['name'])
                    
                    # Check for exact match first (normalized)
                    if normalized_product == normalized_product_name:
                        matched_product_id = product['id']
                        print(f"Exact match found: {product['name']} -> ID: {matched_product_id}")
                        break
                    
                    # Also check if the product name contains the search term (for partial matches)
                    if normalized_product_name.lower() in normalized_product.lower():
                        matched_product_id = product['id']
                        print(f"Partial match found: {product['name']} -> ID: {matched_product_id}")
                        break

                # If we found the matched product ID, stop fetching more pages
                if matched_product_id:
                    break

                page += 1  # Move to the next page

            # Return the matched product ID if found, otherwise None
            if matched_product_id:
                return {"id": matched_product_id, "exist": True}
            else:
                print(f"No product found with name: {product_name}")
                return {"id": None, "exist": False}

        except requests.exceptions.RequestException as e:
            # Handle any errors during the request
            print(f"Error fetching products: {e}")
            return {"id": None, "exist": False}

    def reduce_stock_by_name(self, product_name, quantity_to_reduce):
        """Reduce stock quantity for a product by its name - specifically for fundraising items."""
        try:
            # First, find the product by name
            product_result = self.getProductIdByName(product_name)
            
            if not product_result.get('exist'):
                return {
                    'success': False,
                    'error': f'Product not found: {product_name}'
                }
            
            product_id = product_result['id']
            print(f"Found product '{product_name}' with ID: {product_id}")
            
            # Now reduce the stock using the existing reduce_stock method
            return self.reduce_stock(product_id, quantity_to_reduce)
            
        except Exception as e:
            print(f"Error in reduce_stock_by_name: {e}")
            return {
                'success': False,
                'error': str(e)
            }
