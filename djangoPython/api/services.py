import requests
from django.conf import settings
import re
import math

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
                for product in products:
                    print(product)
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

    def get_marriage_prep_products(self):
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
                    and product['categories'][1].get('name') == 'Marriage Preparation Programme'
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
                    and len(product['categories']) >= 1
                    and (
                        (len(product['categories']) >= 1 and product['categories'][0].get('name') == 'Talks And Seminar') or
                        (len(product['categories']) >= 2 and product['categories'][1].get('name') == 'Talks And Seminar') or
                        (len(product['categories']) >= 3 and product['categories'][2].get('name') == 'Talks And Seminar')
                    )
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

    def get_fundraising_products(self):
        """Fetch and filter fundraising products from WooCommerce."""
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
                print(products)
                if not products:
                    break  # Exit the loop if no products are returned

                # Filter products based on the criteria for fundraising
                filtered_products = [
                    product for product in products
                    if product.get('status') == 'publish'
                    and 'categories' in product
                    and (len(product['categories']) == 2 or len(product['categories']) == 1)
                    and any(category.get('name') == 'Support Us' for category in product['categories'])
                ]

                # Add filtered products to the list
                all_products.extend(filtered_products)

                # Increment page to fetch next set of products
                page += 1

            except requests.exceptions.RequestException as e:
                # Handle any errors during the request
                print(f"Error while fetching fundraising products: {e}")
                break

        return all_products

    def getProductId(self, chinese, english, location):
        """Fetches the product ID by matching Chinese, English, and Location names from WooCommerce."""
        try:
            print("Get Product Id", chinese, english, location)
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
                    #print("Name:", product_name)
                    

                    if len(split_name) == 3:
                        chinese_name = split_name[0].strip()  # Removes leading/trailing spaces
                        english_name = split_name[1].strip()
                        location_name = split_name[2].strip()
                        print(chinese_name, english_name, location_name)
                                            
                        # If the product matches the input chinese, english, and location, return the product ID
                        if chinese_name == chinese and english_name == english and location_name == location:
                            matched_product_id = product['id']
                            break  # Exit the loop if the product is found
                    
                    if len(split_name) == 2:
                        english_name = split_name[0].strip()
                        location_name = split_name[1].strip()
                        print(english_name, location_name)
                                            
                        # If the product matches the input chinese, english, and location, return the product ID
                        if english_name == english and location_name == location:
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
        
    def getFundraisingId(self, product_name):
        """Fetches the product ID by matching product name from WooCommerce."""
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

                # Check each product for name match
                for product in products:
                    current_product_name = product['name']
                    
                    # Direct name match for fundraising products
                    if current_product_name == product_name:
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

    def get_fundraising_product_details(self, product_names):
        """Fetches detailed product information from WooCommerce for multiple products by name."""
        try:
            product_details = []
            
            for product_name in product_names:
                page = 1
                per_page = 100
                product_found = False
                
                while True and not product_found:
                    # Fetch products for the current page
                    url = f"{self.base_url}products"
                    params = {
                        'per_page': per_page,
                        'page': page,
                    }

                    response = requests.get(url, params=params, auth=self.auth)
                    response.raise_for_status()

                    products = response.json()
                    
                    if not products:
                        break

                    # Check each product for name match
                    for product in products:
                        current_product_name = product['name']
                        
                        # Direct name match for fundraising products
                        if current_product_name == product_name:
                            # Extract the details we need
                            product_detail = {
                                'id': product['id'],
                                'name': product['name'],
                                'price': product['price'],
                                'regular_price': product['regular_price'],
                                'sale_price': product['sale_price'],
                                'images': product.get('images', []),
                                'description': product.get('description', ''),
                                'short_description': product.get('short_description', ''),
                                'stock_quantity': product.get('stock_quantity'),
                                'manage_stock': product.get('manage_stock', False),
                                'in_stock': product.get('in_stock', True)
                            }
                            product_details.append(product_detail)
                            product_found = True
                            break

                    if product_found:
                        break
                        
                    page += 1

            return product_details

        except requests.exceptions.RequestException as e:
            print(f"Error fetching product details: {e}")
            return []
        

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
            print("Updating Product Stock12:", status)

            # Get the current stock quantity
            original_stock_quantity = product.get("stock_quantity", 0)
            new_stock_quantity = original_stock_quantity  # Start with current stock
            print("Current Stock Quantity:", new_stock_quantity)

            # Parse short description to find "vacancy"
            short_description = product.get("short_description", "")
            array = short_description.split("<p>")
            print("Short Description Array:", array)
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
                vacancies =  math.ceil(int(vacancies_match.group(1))*1.5)
            else:
                vacancies = 0  # Return 0 if no vacancies are found

            print("Actual Vacancies:", vacancies)

            print(f"Processing status: '{status}' (type: {type(status)})")

            # **Stock Update Logic**
            if status == "Withdrawn":
                print(f"Withdrawn status detected. Current stock: {new_stock_quantity}, Vacancies: {vacancies}")
                if new_stock_quantity < vacancies:  # Only increase stock if it is below vacancies
                    print("Increase stock by 1")
                    new_stock_quantity += 1
                else:
                    print("Stock is full, no increase.")  # Prevent increase beyond vacancies

            elif status in ["Paid", "SkillsFuture Done", "Confirmed"]:
                print(f"Payment/Confirmation status detected: {status}")
                if new_stock_quantity > 0:  # Only decrease if stock is greater than 0
                    print("Decrease stock by 1")
                    new_stock_quantity -= 1  
                else:
                    print("Stock is already 0, cannot decrease further.")  # Prevents negative stock
            else:
                print(f"Unhandled status: '{status}' - no stock update performed")

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

    def updatePortOver(request, product_id):
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
                    vacancies = math.ceil(int(vacancies_match.group(1))*1.5)
                else:
                    vacancies = 0  # Return 0 if no vacancies are found

                print("Actual Vacancies:", vacancies)

                if new_stock_quantity < vacancies:  # Only increase stock if it is below vacancies
                    print("Increase stock by 1")
                    new_stock_quantity += 1
                else:
                    print("Stock is full, no increase.")  # Prevent increase beyond vacancies

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

    def updateFundraisingQuantity(request, product_id, status, quantity):
        try:
            # Fetch current product details
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
            response = requests.get(url, auth=auth)
            response.raise_for_status()

            product = response.json()

            # Get the current stock quantity
            original_stock_quantity = product.get("stock_quantity", 0)
            new_stock_quantity = original_stock_quantity  # Start with current stock

            # **Stock Update Logic for Fundraising Products**
            if status == "Withdrawn":
                new_stock_quantity += quantity

            elif status == "Refunded":
                # Increase stock when order is refunded
                new_stock_quantity += quantity
                print(f"Increasing stock by {quantity} for refunded order")

            elif status in ["Paid", "Confirmed"]:
                if new_stock_quantity >= quantity:  # Only decrease if sufficient stock
                    new_stock_quantity -= quantity
                else:
                    new_stock_quantity = 0  # Set to 0 if not enough stock
            else:
                print(f"Unhandled status: '{status}' - no stock update performed")

            print("Updated Stock Quantity:", new_stock_quantity)

            # Update stock
            update_data = {"stock_quantity": new_stock_quantity}
            update_response = requests.put(f"{settings.WOOCOMMERCE_API_URL}products/{product_id}",
                                            json=update_data, auth=auth)
            update_response.raise_for_status()

            return True  # Successfully updated stock

        except requests.exceptions.RequestException as e:
            print(f"Error updating fundraising product stock: {e}")
            return False

    def update_fundraising_product_details(self, product_id, price, stock_quantity, 
                                            stock_operation=None, original_stock=None, 
                                            operation_value=None):
        """
        Updates a fundraising product's price and stock quantity.
        
        Args:
            product_id: The ID of the product to update.
            price: The new price for the product.
            stock_quantity: The new stock quantity for the product.
            stock_operation: Optional - Type of operation ('add', 'reduce', 'restock').
            original_stock: Optional - Original stock before operation.
            operation_value: Optional - Value used in the operation.
        
        Returns:
            dict: Success status and updated product data or error message.
        """
        try:
            # Validate inputs
            if product_id is None:
                raise ValueError("product_id is required")
            
            # Ensure stock_quantity is an integer
            if stock_quantity is None:
                stock_quantity = 0
            stock_quantity = int(stock_quantity)
            
            if stock_quantity < 0:
                stock_quantity = 0  # Ensure non-negative stock
            
            # Log the operation for debugging
            print(f"\n{'='*60}")
            print(f"Updating Product {product_id}:")
            print(f"  Price: {price}")
            print(f"  Stock Quantity: {stock_quantity}")
            if stock_operation:
                print(f"  Operation: {stock_operation}")
                print(f"  Original Stock: {original_stock}")
                print(f"  Operation Value: {operation_value}")
            print(f"{'='*60}\n")
            
            # Prepare the update data for WooCommerce
            # Note: WooCommerce requires manage_stock=true to update stock_quantity
            update_data = {
                "regular_price": str(price) if price else "0",
                "price": str(price) if price else "0",
                "manage_stock": True,  # Enable stock management
                "stock_quantity": int(stock_quantity)
            }
            
            print(f"  Update Payload: {update_data}")
            
            # Make the API request to update the product
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
            
            print(f"  Sending PUT request to: {url}")
            response = requests.put(url, json=update_data, auth=auth)
            response.raise_for_status()
            
            updated_product = response.json()
            
            # Log successful update with details
            print(f"✓ Product {product_id} updated successfully")
            print(f"  WooCommerce Response Stock: {updated_product.get('stock_quantity')}")
            print(f"  WooCommerce Response manage_stock: {updated_product.get('manage_stock')}\n")
            
            return {
                "success": True,
                "product": updated_product,
                "message": f"Product {product_id} updated successfully",
                "stock_quantity": updated_product.get('stock_quantity')
            }
            
        except ValueError as e:
            error_msg = f"Validation error updating product {product_id}: {str(e)}"
            print(f"✗ {error_msg}\n")
            return {
                "success": False,
                "error": error_msg,
                "message": f"Validation failed for product {product_id}"
            }
        except requests.exceptions.RequestException as e:
            error_msg = f"Error updating fundraising product details: {e}"
            print(f"✗ {error_msg}\n")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to update product {product_id}"
            }

    def get_product_stock(self, product_id):
        """
        Gets the current stock quantity of a product by its ID.
        
        Args:
            product_id: The ID of the product to fetch stock for.
        
        Returns:
            dict: Success status and stock data or error message.
        """
        try:
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
            
            response = requests.get(url, auth=auth)
            response.raise_for_status()
            
            product = response.json()
            stock_quantity = product.get('stock_quantity', 0)
            
            return {
                "success": True,
                "product_id": product_id,
                "stock_quantity": stock_quantity,
                "product": product,
                "message": f"Successfully retrieved stock for product {product_id}"
            }
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching product stock: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to fetch stock for product {product_id}"
            }

    def update_fundraising_product_stock(self, product_id, method, stock_quantity):
        """
        Updates a fundraising product's stock quantity.
        
        Args:
            product_id: The ID of the product to update.
            method: The method for stock update ('reduce' or 'set').
                   - 'reduce': Subtracts stock_quantity from current stock
                   - 'set': Sets stock_quantity as the new stock value
            stock_quantity: The stock quantity to use (amount to reduce or new value).
        
        Returns:
            dict: Success status and updated product data or error message.
        """
        try:
            # If method is 'reduce', first get the current stock quantity
            if method.lower() == 'reduce':
                stock_result = self.get_product_stock(product_id)
                if not stock_result["success"]:
                    return stock_result  # Return the error from getting stock
                
                current_stock = int(stock_result["stock_quantity"] or 0)
                new_stock = max(0, current_stock - int(stock_quantity))  # Ensure stock doesn't go negative
                
                update_data = {
                    "stock_quantity": new_stock
                }
            elif method.lower() == 'increase':
                stock_result = self.get_product_stock(product_id)
                if not stock_result["success"]:
                    return stock_result  # Return the error from getting stock
                
                current_stock = int(stock_result["stock_quantity"] or 0)
                new_stock = current_stock + int(stock_quantity)

                update_data = {
                    "stock_quantity": new_stock
                }
                
            # Make the API request to update the product
            url = f"{settings.WOOCOMMERCE_API_URL}products/{product_id}"
            auth = (settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
            
            response = requests.put(url, json=update_data, auth=auth)
            response.raise_for_status()
            
            updated_product = response.json()
            
            return {
                "success": True,
                "product": updated_product,
                "message": f"Product {product_id} updated successfully"
            }
            
        except requests.exceptions.RequestException as e:
            print(f"Error updating fundraising product details: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to update product {product_id}"
            }
