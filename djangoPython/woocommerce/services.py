import requests
from django.conf import settings
import re

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
                        chinese_name = split_name[0]
                        english_name = split_name[1]
                        location_name = split_name[2]

                        # If the product matches the input chinese, english, and location, return the product ID
                        if chinese_name == chinese and english_name == english and location_name == location:
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

    def updateCourseQuantity(request, product_id, status):
        """
        Updates the product stock based on the product ID and the status.
        Arguments:
            - product_id: The ID of the product to update.
            - status: The status to update stock based on ("Cancelled", "Paid", "SkillsFuture Done").
        """
        try:
            # Fetch current product details
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
            response = requests.get(url, auth=auth)
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

            # **Stock Update Logic**
            if status == "Cancelled":
                if new_stock_quantity < vacancies:  # Only increase stock if it is below vacancies
                    print("Increase stock by 1")
                    new_stock_quantity += 1
                else:
                    print("Stock is full, no increase.")  # Prevent increase beyond vacancies

            elif status in ["Paid", "SkillsFuture Done"]:
                if new_stock_quantity > 0:  # Only decrease if stock is greater than 0
                    print("Decrease stock by 1")
                    new_stock_quantity -= 1  
                else:
                    print("Stock is already 0, cannot decrease further.")  # Prevents negative stock

            print("Updated Stock Quantity:", new_stock_quantity)

            # Only update stock if it has changed
            update_data = {"stock_quantity": new_stock_quantity}
            update_response = requests.put(f"{settings.WOOCOMMERCE_API_URL}products/{product_id}",
                                            json=update_data, auth=auth)
            update_response.raise_for_status()

            return True  # Successfully updated stock

        except requests.exceptions.RequestException as e:
            print(f"Error updating product stock: {e}")
            return False

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
                    # Check for exact match first
                    if product['name'] == product_name:
                        matched_product_id = product['id']
                        print(f"Exact match found: {product['name']} -> ID: {matched_product_id}")
                        break
                    
                    # Also check if the product name contains the search term (for partial matches)
                    if product_name.lower() in product['name'].lower():
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
