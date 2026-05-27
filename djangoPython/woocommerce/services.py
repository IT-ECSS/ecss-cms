import requests
from django.conf import settings
import re
import unicodedata
from pymongo import MongoClient
import os

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

    def getProductIdAndQuantity(self, chinese, english, location):
        """Fetches the product ID and stock quantity by matching Chinese, English, and Location names from WooCommerce."""
        try:
            page = 1
            per_page = 100  # Number of products to fetch per page
            matched_product_id = None  # Variable to store matched product ID
            matched_product_stock = None  # Variable to store matched product stock quantity
            
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

                        # If the product matches the input chinese, english, and location, store product ID and stock quantity
                        if chinese_name == normalized_chinese and english_name == normalized_english and location_name == normalized_location:
                            matched_product_id = product['id']
                            matched_product_stock = product.get('stock_quantity', 0)
                            break  # Exit the loop if the product is found

                # If we found the matched product, stop fetching more pages
                if matched_product_id:
                    break

                page += 1  # Move to the next page

            # Return the matched product ID and stock quantity if found, otherwise None
            if matched_product_id:
                return {
                    "id": matched_product_id,
                    "quantity": matched_product_stock,
                    "exist": True
                }
            else:
                return {
                    "id": None,
                    "quantity": None,
                    "exist": False
                }

        except requests.exceptions.RequestException as e:
            # Handle any errors during the request
            print(f"Error fetching products: {e}")
            return {
                "id": None,
                "quantity": None,
                "exist": False,
                "error": str(e)
            }

    def get_nsa_vacancies_from_mongodb(self, chinese_name, english_name, location):
        """
        Get the authoritative vacancies count for NSA courses from MongoDB.
        Queries the Registration Forms collection to count booked slots and calculates remaining vacancies.
        
        Arguments:
            - chinese_name: Chinese name of the course
            - english_name: English name of the course
            - location: Location of the course
            
        Returns:
            - remaining_vacancies: Number of available slots (capacity - booked_count)
        """
        try:
            # Get MongoDB connection string from settings
            mongo_uri = settings.MONGODB_URI if hasattr(settings, 'MONGODB_URI') else os.environ.get('MONGODB_URI')
            if not mongo_uri:
                print("WARNING: MONGODB_URI not configured, falling back to WooCommerce vacancies")
                return None
            
            client = MongoClient(mongo_uri)
            db = client['ecss']  # Database name
            collection = db['Registration Forms']  # Collection name
            
            print(f"[NSA MongoDB Query] Searching for course - Chinese: {chinese_name}, English: {english_name}, Location: {location}")
            
            # Query for registrations matching this course
            query = {
                'course_name_ch': normalize_string(chinese_name),
                'course_name': normalize_string(english_name),
                'location': normalize_string(location),
                'course_type': 'NSA'  # Only for NSA courses
            }
            
            # Count booked registrations (only these statuses count as occupying a slot)
            booked_statuses = ["Paid", "Confirmed Slot", "SkillsFuture Done"]
            booked_query = {**query, 'booked_status': {'$in': booked_statuses}}
            booked_count = collection.count_documents(booked_query)
            
            print(f"[NSA MongoDB Query] Booked count: {booked_count}")
            
            # Get total course capacity
            # Query for any document matching this course to get the capacity
            course_doc = collection.find_one(query)
            if course_doc and 'vacancies' in course_doc:
                total_capacity = course_doc.get('vacancies', 30)
            else:
                total_capacity = 30  # Default capacity
            
            print(f"[NSA MongoDB Query] Total capacity: {total_capacity}")
            
            # Calculate remaining vacancies
            remaining_vacancies = max(0, total_capacity - booked_count)
            
            print(f"[NSA MongoDB Query] Remaining vacancies: {remaining_vacancies}")
            
            client.close()
            return remaining_vacancies
            
        except Exception as e:
            print(f"ERROR: Failed to get NSA vacancies from MongoDB: {e}")
            return None

    def updateCourseQuantity(self, product_id, status):
        """
        Updates the product stock based on payment status.
        
        Stock Update Rules:
        - Refunded, Change of Final Payment Method: +1 (refund restores stock)
        - Paid, SkillsFuture Done: -1 (payment reduces stock)
        
        Arguments:
            - product_id: The ID of the product to update.
            - status: Payment/refund status
            - chi_name, eng_name, location: Optional parameters for compatibility
        """
        try:
            # Fetch current product stock from WooCommerce
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()
            
            product = response.json()
            original_stock_quantity = product.get("stock_quantity", 0)
            new_stock_quantity = original_stock_quantity
            
            # Stock Update Logic - simple increment/decrement
            if status in ["Refunded", "Change of Final Payment Method"]:
                new_stock_quantity += 1
            elif status in ["Paid", "SkillsFuture Done"]:
                new_stock_quantity -= 1
            
            print(f"[Stock Update] Product ID: {product_id} | Status: {status} | Current: {original_stock_quantity} → New: {new_stock_quantity}")
            
            # Only update if changed
            if new_stock_quantity == original_stock_quantity:
                return {
                    'success': True,
                    'message': 'Stock unchanged',
                    'product_id': product_id,
                    'stock_quantity': new_stock_quantity,
                }
            
            # Update WooCommerce
            update_data = {"stock_quantity": new_stock_quantity, "manage_stock": True}
            requests.put(
                f"{settings.WOOCOMMERCE_API_URL}products/{product_id}",
                json=update_data,
                auth=self.auth
            ).raise_for_status()
            
            return {
                'success': True,
                'message': 'Stock updated successfully',
                'product_id': product_id,
                'previous_stock': original_stock_quantity,
                'stock_quantity': new_stock_quantity,
            }
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] WooCommerce request failed: {str(e)}")
            return {
                'success': False,
                'error': f'WooCommerce request failed: {str(e)}',
                'product_id': product_id,
            }
        except Exception as e:
            print(f"[ERROR] {str(e)}")
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
