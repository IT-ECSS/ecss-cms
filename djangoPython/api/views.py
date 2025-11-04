from django.http import JsonResponse, HttpResponse
from .services import WooCommerceAPI
from django.views.decorators.csrf import csrf_exempt  # Temporarily disable CSRF validation for this view
from django.conf import settings
import os
import requests
import base64

import json
import plotly.express as px
import pandas as pd
from django.shortcuts import render

@csrf_exempt  # Temporarily disable CSRF validation for this view
def product_list(request):
    """Fetches and returns a list of products from WooCommerce based on the courseType."""
    try:
        # Parse the request body as JSON
        data = json.loads(request.body)
        print("Data received:", data)
        courseType = data.get('courseType')  # Get the courseType from the request body

        # Initialize WooCommerce API instance
        woo_api = WooCommerceAPI()

        # Fetch products based on courseType
        if courseType == "NSA":
            products = woo_api.get_nsa_products()
        elif courseType == "ILP":
            products = woo_api.get_ilp_products()
        elif courseType == "Marriage Preparation Programme":
            products = woo_api.get_marriage_prep_products()
        elif courseType == "Talks And Seminar":
            products = woo_api.get_talks_and_seminar_products()
        else:
            # Handle cases where no valid courseType is provided
            products = woo_api.get_nsa_products() + woo_api.get_ilp_products() + woo_api.get_marriage_prep_products() + woo_api.get_talks_and_seminar_products()

        #print(products)

        # Return the products as a JSON response
        return JsonResponse({"courses": products})

    except json.JSONDecodeError:
         JsonResponse({"error": "Invalid JSON input."}, status=400)

    except Exception as e:
        # Catch and log unexpected errors
        print("Error:", e)
        return JsonResponse({"error": "An error occurred while processing the request."}, status=500)
    
@csrf_exempt  # Temporarily disable CSRF validation for this view
def fundraising_list(request):
    """Fetches and returns a list of products from WooCommerce based on the courseType."""
    try:
        # Initialize WooCommerce API instance
        woo_api = WooCommerceAPI()

        products = woo_api.get_fundraising_products()

        #print(products)

        # Return the products as a JSON response
        return JsonResponse({"fundraising": products})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON input."}, status=400)

    except Exception as e:
        # Catch and log unexpected errors
        print("Error:", e)
        return JsonResponse({"error": "An error occurred while processing the request."}, status=500)

@csrf_exempt
def fundraising_product_details(request):
    """Fetches fundraising products from WooCommerce filtered by category 'Support Us' across all pages."""
    try:
        # Initialize WooCommerce API instance
        woo_api = WooCommerceAPI()
        
        # Get all fundraising products (method handles pagination internally and filters for 'Support Us' category)
        print("Fetching fundraising products from all pages...")
        products = woo_api.get_fundraising_products()
        print(f"Total fundraising products found: {len(products)}")

        # Additional filtering to ensure we have the exact criteria (categories array contains "Support Us" with id 40)
        filtered_products = []
        for product in products:
            categories = product.get('categories', [])
            # Check if any category in the array has name "Support Us" and id 40
            for category in categories:
                if (category.get('name') == 'Support Us' and 
                    category.get('id') == 40):
                    filtered_products.append(product)
                    break  # Found matching category, no need to check other categories

        print(f"Products matching exact criteria (id=40): {len(filtered_products)}")

        # Return filtered fundraising products as a JSON response
        return JsonResponse({
            "success": True,
            "fundraising_products": filtered_products
        })

    except Exception as e:
        # Catch and log unexpected errors
        print("Error:", e)
        return JsonResponse({"error": "An error occurred while processing the request."}, status=500)

import re
import json
from django.shortcuts import render
from django.http import JsonResponse

@csrf_exempt
def product_stock_dashboard(request):
    """Dashboard for displaying product stock data and insights."""
    try:
        # Ensure it's a GET request
        if request.method != "GET":
            return JsonResponse({"error": "Invalid HTTP method. Only GET is allowed."}, status=405)

        # Fetch products from WooCommerce API
        woo_api = WooCommerceAPI()
        products = woo_api.get_nsa_products()  # Adjust the method name if necessary

        # Extract product names and stock quantities
        product_data = []
        for product in products:
            # Split the product name by <br/> or <br />
            split_name = re.split(r'<br\s*/?>', product.get('name', ''))

            # Process the name based on split length
            if len(split_name) == 3:
                processed_name = f"{split_name[1].strip()} {split_name[2][1:-1].strip()}"  # Correct slicing
            elif len(split_name) == 2:
                processed_name = f"{split_name[0].strip()} {split_name[1][1:-1].strip()}"  # Correct slicing
            else:
                processed_name = " ".join(part.strip() for part in split_name)  # Handle unexpected length

            # Append processed product data
            product_data.append({
                'name': processed_name,
                'stock': product.get('stock_quantity', 0)  # Default stock to 0 if missing
            })

        # Calculate insights
        if product_data:
            most_stocked_product = min(product_data, key=lambda x: x['stock'])['name']
            least_stocked_product = max(product_data, key=lambda x: x['stock'])['name']
        else:
            most_stocked_product = "N/A"
            least_stocked_product = "N/A"

        # Prepare context for the template
        context = {
            'product_data': json.dumps(product_data),  # Serialize product data to JSON
            'most_stocked_product': most_stocked_product,
            'least_stocked_product': least_stocked_product,
        }

        return render(request, 'woocommerce/example.html', context)

    except Exception as e:
        # Log the error (optional) and return a JSON error response
        print("Error in product_stock_dashboard:", e)
        return JsonResponse({"error": str(e)}, status=500)

import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def product_stock_dashboard_react(request):
    try:
        # Fetch products from WooCommerce APIok
        woo_api = WooCommerceAPI()  # Ensure WooCommerceAPI is correctly implemented elsewhere
        products = woo_api.get_nsa_products()  # Replace with the correct method to fetch products

        # Extract product names and stock quantities with custom logic for name splitting
        product_data = []
        for product in products:
            # Ensure 'name' and 'stock_quantity' exist
            product_name = product.get('name', None)
            stock_quantity = product.get('stock_quantity', None)

            if product_name is None or stock_quantity is None:
                continue  # Skip if either 'name' or 'stock_quantity' is missing

            # Split the product name by <br/> or <br />
            split_name = re.split(r'<br\s*/?>', product_name)

            # Determine how to process the name based on the split length
            if len(split_name) == 3:
                # Process the name as expected
                processed_name = f"{split_name[1]} | {split_name[2][1:-1]}"  # Remove brackets around the location
            elif len(split_name) == 2:
                # Process name and location if there are two parts
                processed_name = f"{split_name[0]} | {split_name[1][1:-1]}"  # Remove brackets around the location
            else:
                # Join all parts if the name does not have the expected split structure
                processed_name = " ".join(split_name)

            # Ensure stock quantity is a valid number
            try:
                stock_quantity = int(stock_quantity)
                if stock_quantity < 0:
                    continue  # Skip products with invalid stock quantities
            except ValueError:
                continue  # Skip if stock quantity is not a valid integer

            # Append processed product data
            product_data.append({
                'name': processed_name,
                'stock': stock_quantity
            })

        # Check if product data is empty
        if not product_data:
            return JsonResponse({"error": "No product data available"}, status=400)

        # Calculate insights
        most_stocked_product = max(product_data, key=lambda x: x['stock'])['name']  # Most stocked product
        least_stocked_product = min(product_data, key=lambda x: x['stock'])['name']  # Least stocked product

        # Return JSON response
        return JsonResponse({
            'product_data': product_data,  # Return the processed product data
            'most_stocked_product': most_stocked_product,
            'least_stocked_product': least_stocked_product
        })

    except Exception as e:
        # Catch and log unexpected errors
        return JsonResponse({"error": str(e)}, status=500)

'''Working with Database'''
from collections import defaultdict
from pymongo import MongoClient
from django.shortcuts import render

@csrf_exempt
def sales_report_view(request):
    # MongoDB connection
    client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
    db = client["Company-Management-System"]
    collection = db["Registration Forms"]

    # Retrieve documents where courseType is 'NSA' and status is 'Paid'
    documents = list(collection.find({"course.courseType": "NSA", "status": "Paid"}))

    # Prepare an aggregation dictionary
    course_totals = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))  # Nested dictionary for totals by location and quarter

    # Helper function for quarter formatting
    def format_quarter_for_price(course_duration):
        try:
            # Parse the duration to extract the month and determine the quarter
            duration = course_duration.split("-")[0].strip()
            duration1 = duration.split(" ")[1].strip()
            return format_quarter(duration1) + " " + duration.split(" ")[2].strip()
        except:
            return "Unknown Quarter"

    # Process each document
    for doc in documents:
        # Clean up and convert coursePrice to a float
        course_price = doc['course'].get('coursePrice', None)
        if course_price and isinstance(course_price, str) and course_price.startswith('$'):
            course_price = float(course_price.replace('$', '').strip())
        else:
            course_price = 0.0

        # Ensure fields are included
        course_duration = doc['course'].get('courseDuration', 'N/A')  # Default to 'N/A' if missing
        course_quarter = format_quarter_for_price(course_duration)
        course_eng_name = doc['course'].get('courseEngName', 'N/A')  # Default to 'N/A' if missing
        course_location = doc['course'].get('courseLocation', 'N/A')  # Default to 'N/A' if missing

        # Add to aggregation based on location and quarter
        course_totals[course_eng_name][course_location][course_quarter] += course_price

        # Serialize MongoDB ObjectId to a string for JSON compatibility
        doc["_id"] = str(doc["_id"])

    # Convert the nested dictionary to a list of results for the template
    aggregated_data = [
        {
            "courseEngName": course_name,
            "locations": [
                {
                    "courseLocation": location,
                    "quarters": [
                        {"courseQuarter": quarter, "totalPrice": total}
                        for quarter, total in quarters.items()
                    ]
                }
                for location, quarters in locations.items()
            ]
        }
        for course_name, locations in course_totals.items()
    ]

    # Pass both raw documents and aggregated data to the template
    return render(request, 'woocommerce/salesReport.html', {'documents': documents, 'aggregated_data': aggregated_data})

@csrf_exempt
def format_quarter(month_name):
    # Map month names to their corresponding month numbers
    month_mapping = {
    "January": 1, "February": 2, "March": 3,
    "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9,
    "October": 10, "November": 11, "December": 12
    }

    # Get the month number from the full month name
    month_number = month_mapping.get(month_name.strip(), None)

    if month_number is None:
        return "Unknown Quarter"  # Handle invalid month names

    # Determine the quarter based on the month number
    if 1 <= month_number <= 3:
        return "Q1 (January To March)"
    elif 4 <= month_number <= 6:
        return "Q2 (April To June)"
    elif 7 <= month_number <= 9:
        return "Q3 (July To September)"
    elif 10 <= month_number <= 12:
        return "Q4 (October To December)"

    return "Unknown Quarter"

from pymongo import MongoClient
from django.http import JsonResponse
from bson import ObjectId
import json
from collections import defaultdict
from datetime import datetime
import inflect

@csrf_exempt
# Custom JSON encoder to handle MongoDB ObjectId1
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
            return super().default(o)

@csrf_exempt
def format_price(price):
    return f"${price:,.2f}"

#ok

@csrf_exempt
def generate_report(request):
    """Fetches and returns data from the MongoDB collection for the report, filtering only NSA course types."""

    # MongoDB connection
    client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
    db = client["Company-Management-System"]
    collection = db["Registration Forms"]

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        print("Gathering Data For Monthly Report (NSA Courses Only)")

        # Fetch only documents where course.courseType is "NSA"
        filtered_data = list(collection.find({"course.courseType": "NSA"}))

        # Convert ObjectId to string for JSON serialization
        for doc in filtered_data:
            doc['_id'] = str(doc['_id'])  # Convert ObjectId to a string

        # Log the filtered data for debugging
        print(filtered_data)

        # Return the filtered data
        return JsonResponse({'success': True, 'data': filtered_data})

    except Exception as e:
        print("Error:", e)  # Log the error
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def sales_report_view_react(request):
    try:
        # MongoDB connection
        client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
        db = client["Company-Management-System"]
        collection = db["Registration Forms"]

        # Retrieve documents where courseType is 'NSA' and status is 'Paid'
        documents = list(collection.find({"course.courseType": "NSA", "status": "Paid"}))

        # Prepare an aggregation dictionary
        course_totals = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))  # Nested dictionary for totals by location and quarter

        # Helper function for quarter formatting
        def format_quarter_for_price(course_duration):
            try:
                # Parse the duration to extract the month and determine the quarter
                duration = course_duration.split("-")[0].strip()  # Assuming the quarter format logic is pre-defined
                duration1 = duration.split(" ")[1].strip()
                return format_quarter(duration1) + " " + duration.split(" ")[2].strip()
            except Exception as e:
                return "Unknown Quarter"

        # Process each document
        for doc in documents:
            # Clean up and convert coursePrice to a float
            course_price = doc['course'].get('coursePrice', None)
            if course_price and isinstance(course_price, str) and course_price.startswith('$'):
                course_price = float(course_price.replace('$', '').strip())
            else:
                course_price = 0.0

            # Ensure fields are included
            course_duration = doc['course'].get('courseDuration', 'N/A')  # Default to 'N/A' if missing
            course_quarter = format_quarter_for_price(course_duration)
            course_eng_name = doc['course'].get('courseEngName', 'N/A')  # Default to 'N/A' if missing
            course_location = doc['course'].get('courseLocation', 'N/A')  # Default to 'N/A' if missing

            # Add to aggregation based on location and quarter
            course_totals[course_eng_name][course_location][course_quarter] += course_price

            # Serialize MongoDB ObjectId to a string for JSON compatibility
            doc["_id"] = str(doc["_id"])

        # Convert the nested dictionary to a list of results
        aggregated_data = [
            {
                "courseEngName": course_name,
                "locations": [
                    {
                        "courseLocation": location,
                        "quarters": [
                            {"courseQuarter": quarter, "totalPrice": total}
                            for quarter, total in quarters.items()
                        ]
                    }
                    for location, quarters in locations.items()
                ]
            }
            for course_name, locations in course_totals.items()
        ]

        # Return aggregated data as JSON response
        return JsonResponse({'documents': documents, 'aggregated_data': aggregated_data}, safe=False)

    except Exception as e:
        # Handle errors and return a JSON error response
        return JsonResponse({"error": str(e)}, status=500)
    
# Function to generate invoices
@csrf_exempt
def generate_invoice_view_react(request):
    # MongoDB connection
    client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
    db = client["Company-Management-System"]
    collection = db["Registration Forms"]

    p = inflect.engine()

    # Query for filtering documents
    query = {
        "course.payment": "SkillsFuture",
        "status": "Paid",
        "official.receiptNo": {"$ne": ""}
    }

    documents = list(collection.find(query))

    # Aggregation dictionary to store data
    course_data = defaultdict(lambda: {
        "courses": [],
        "total_price": 0
    })

    course_accumulation = defaultdict(lambda: {"count": 0, "total_price": 0})
    seen_courses = set()

    for doc in documents:
        course_eng_name = doc["course"].get("courseEngName")
        course_location = doc["course"].get("courseLocation")
        if not course_eng_name:
            continue

        course_price = doc["course"].get("coursePrice", 0)
        if isinstance(course_price, str) and course_price.startswith('$'):
            course_price = float(course_price.replace('$', '').strip())
        course_price *= 5
        course_price = round(course_price, 2)

        no_of_people = doc["course"].get("numberOfPeople", 1)
        total_price = round(course_price * no_of_people, 2)

        course_duration_raw = doc["course"].get("courseDuration")
        formatted_start_date = None
        formatted_end_date = None
        if course_duration_raw:
            try:
                start_raw, end_raw = course_duration_raw.split(" - ")
                start_date = datetime.strptime(start_raw, "%d %B %Y")
                end_date = datetime.strptime(end_raw, "%d %B %Y")
                formatted_start_date = f"{start_date.day}.{start_date.month}.{start_date.year}"
                formatted_end_date = f"{end_date.day}.{end_date.month}.{end_date.year}"
            except (ValueError, IndexError):
                pass

        official_date_raw = doc["official"].get("date")
        formatted_month_year = None
        if official_date_raw:
            try:
                official_date = datetime.strptime(official_date_raw, "%d/%m/%Y")
                formatted_month_year = official_date.strftime("%B %Y")
            except ValueError:
                pass

        payment_date = formatted_month_year or "Unknown Month-Year"
        course_key = (course_eng_name, course_location, formatted_start_date, formatted_end_date)
        course_accumulation[course_key]["count"] += no_of_people
        course_accumulation[course_key]["total_price"] += total_price

        course_details = {
            "course": course_eng_name,
            "location": course_location,
            "details": {
                "price": f"${course_price:.2f}",
                "total_price": f"${total_price:.2f}",
                "startDate": formatted_start_date,
                "endDate": formatted_end_date
            }
        }

        if course_key not in seen_courses:
            seen_courses.add(course_key)
            course_data[payment_date]["courses"].append(course_details)

    cleaned_course_data = {}
    for payment_date, data in course_data.items():
        filtered_courses = []
        for course in data["courses"]:
            course_key = (course["course"], course["location"], course["details"]["startDate"], course["details"]["endDate"])
            count = course_accumulation[course_key]["count"]
            total_price = course_accumulation[course_key]["total_price"]
            if course["course"] and any(v for v in course["details"].values()):
                course["details"]["total_price"] = f"${total_price:.2f}"
                course["details"]["count"] = count
                filtered_courses.append(course)

        if filtered_courses:
            cleaned_course_data[payment_date] = {
                "courses": filtered_courses,
                "total_price": 0
            }

            for course in filtered_courses:
                cleaned_course_data[payment_date]["total_price"] += float(course["details"]["total_price"].replace('$', '').strip())

            data["total_price"] = cleaned_course_data[payment_date]["total_price"]
            price_value = data["total_price"]
            dollars = int(price_value)
            cents = round((price_value - dollars) * 100)
            dollars_in_words = p.number_to_words(dollars)
            if cents > 0:
                cents_in_words = p.number_to_words(cents)
                price_in_words = f"{dollars_in_words} Singapore Dollars and {cents_in_words} cents Only"
            else:
                price_in_words = f"{dollars_in_words} Singapore Dollars Only"

            cleaned_course_data[payment_date]["total_price_in_words"] = ' '.join([word.capitalize() for word in price_in_words.split()])

    return JsonResponse({"invoice": cleaned_course_data})

import json
import re
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# Ensure WooCommerceAPI is imported correctly
# from your_project.woocommerce import WooCommerceAPI

@csrf_exempt
def gather_products(request):
    """Fetches and returns a list of products from WooCommerce, processing course names with <br/> and <p> delimiters."""
    try:
        # Only handle GET requests
        if request.method == "GET":
            # Initialize WooCommerce API instance
            woo_api = WooCommerceAPI()

            # Fetch both NSA and ILP products unconditionally
            products = woo_api.get_nsa_products()

            # Prepare a list to store the cleaned product data (name, id, short description)
            cleaned_products = []
            for product in products:
                name = product.get('name', '').strip()  # Get the product name and remove leading/trailing spaces
                product_id = product.get('id')  # Get the product ID
                short_description = product.get('short_description', '').strip()  # Get the short description and clean it

                # Split the short description by <p> or </p> tags
                short_description_parts = re.split(r'<\s*/?\s*p\s*/?>', short_description)

                # Split the name by <br/> or <br /> tags
                name_parts = re.split(r'<br\s*/?>', name)

                # Handle the length of the resulting list for the name
                if len(name_parts) == 3:
                    cleaned_name = f"{name_parts[1].strip()} | {name_parts[2][1:-1].strip()}"
                    location = name_parts[2][1:-1].strip()
                elif len(name_parts) == 2:
                    cleaned_name = f"{name_parts[0].strip()} | {name_parts[1][1:-1].strip()}"
                    location = name_parts[1][1:-1].strip()
                else:
                    cleaned_name = name_parts[0].strip()
                    location = ""

                # Determine the WhatsApp button based on the location
                if location == "CT Hub":
                    whatsapp = '[njwa_button id="14187"]'
                elif location == "Tampines 253 Centre":
                    whatsapp = '[njwa_button id="14182"]'
                elif location == "Pasir Ris Wellness Centre":
                    whatsapp = '[njwa_button id="14185"]'
                else:
                    whatsapp = ''

                # Append the cleaned product details to the list
                cleaned_products.append({
                    'name': cleaned_name,
                    'id': product_id,
                    'short_description': short_description_parts,
                    'location': whatsapp
                })

            # Return the cleaned product data to the template
            return render(request, 'woocommerce/update.html', {'courses': cleaned_products})

        else:
            return JsonResponse({"error": "Invalid HTTP method. Only GET is allowed."}, status=405)

    except Exception as e:
        # Catch and log unexpected errors
        print("Error:", e)
        return JsonResponse({"error": "An error occurred while processing the request."}, status=500)

@csrf_exempt
def sendToWooCommerce(request):
    if request.method == 'POST':
        try:
            # Parse incoming JSON data from request body
            woo_api = WooCommerceAPI()
            data = json.loads(request.body)
            product_id = data.get('courseId')  # Get the WooCommerce product ID

            if not product_id:
                return JsonResponse({'success': False, 'error': 'Product ID is required'})

            short_description = data.get('shortDescription', '')

            # Validate and format short_description
            if isinstance(short_description, list):
                short_description = ' '.join([f'<p>{str(item)}</p>' for item in short_description])
            else:
                short_description = str(short_description)

            # Prepare the data to send in the request body to WooCommerce
            product_data = {
                'short_description': short_description  # Include other fields like price, description, etc.
            }

            # Call the function to update the product in WooCommerce
            updated_product = woo_api.update_product(product_id, product_data)
            print("Result:", updated_product)

            # Return a success or failure response
            if 'error' in updated_product:
                return JsonResponse({'success': False, 'error': updated_product['error']})
            else:
                return JsonResponse({'success': True, 'product': updated_product})

        except Exception as e:
            print("Error:", e)  # Log the error to the console
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})
    
@csrf_exempt
def update_stock(request):
    """Fetches and returns a list of products from WooCommerce based on the courseType."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        # Parse the request body as JSON
        data = json.loads(request.body)
        print("Data received:", data)

        # Get courseName from the request body and clean it up
        courseName = data.get('page')  # Assuming 'page' is where the course name is stored
        
        if courseName:
            # Format the course name details as a string for logging
            # Get the course name components
            chi_name = courseName.get('courseChiName', '')
            eng_name = courseName.get('courseEngName', '')
            location = courseName.get('courseLocation', '')
            print(chi_name+"<br />"+eng_name+"<br />"+location)

            # Initialize WooCommerce API and fetch the product ID
            woo_api = WooCommerceAPI()
            result = woo_api.getProductId(chi_name, eng_name, f"({location})")  # Use the formatted string
            print("Result:", result)

            if result['exist'] == True:
                print("Update Product Stocks")
                status = data.get('status') 
                productId = result['id']
                print('Product Id:', result)
                result2 = woo_api.updateCourseQuantity(productId, status)

                print(status)

                return JsonResponse({'success': result2})

        else:
            print("No course data found in the 'page' field.")

    except Exception as e:
        print("Error:", e)  # Log the error to the console
        return JsonResponse({'success': False, 'error': str(e)})
    
@csrf_exempt
def update_fundraising_product_details(request):
    """Updates a fundraising product's price and stock quantity based on product ID."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        # Parse the request body as JSON
        data = json.loads(request.body)
        print("Data received for fundraising product update:", data)

        # Get required fields from the request body
        product_id = data.get('product_id')
        price = data.get('price')
        stock_quantity = data.get('stock_quantity')

        try:
            stock_quantity = int(stock_quantity)
            price = float(price)
            if stock_quantity < 0 and price <= 0:
                return JsonResponse({'success': False, 'error': 'Stock quantity must be non-negative'})
        except (ValueError, TypeError):
            return JsonResponse({'success': False, 'error': 'Invalid stock quantity format'})
        
        # Initialize WooCommerce API and update the product
        woo_api = WooCommerceAPI()
        result = woo_api.update_fundraising_product_details(product_id, price, stock_quantity)
        
        if result['success']:
            return JsonResponse({
                'success': True,
                'message': result['message'],
                'product_id': product_id,
                'updated_stock_quantity': stock_quantity
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': result.get('error', 'Unknown error occurred'),
                'message': result.get('message', 'Failed to update product')
            })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON format'})
    except Exception as e:
        print("Error in update_fundraising_product:", e)
        return JsonResponse({'success': False, 'error': str(e)})


    
@csrf_exempt
def update_fundraising_product_stock(request):
    """Updates a fundraising product's price and stock quantity based on product ID."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        # Parse the request body as JSON
        data = json.loads(request.body)
        print("Data received for fundraising product update:", data)

        # Get required fields from the request body
        product_id = data.get('product_id')
        method = data.get('method')
        stock_quantity = data.get('stock_quantity')

        try:
            stock_quantity = int(stock_quantity)
            if stock_quantity < 0:
                return JsonResponse({'success': False, 'error': 'Stock quantity must be non-negative'})
        except (ValueError, TypeError):
            return JsonResponse({'success': False, 'error': 'Invalid stock quantity format'})
        
        # Initialize WooCommerce API and update the product
        woo_api = WooCommerceAPI()
        result = woo_api.update_fundraising_product_stock(product_id, method, stock_quantity)
        
        if result['success']:
            return JsonResponse({
                'success': True,
                'message': result['message'],
                'product_id': product_id,
                'updated_stock_quantity': stock_quantity
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': result.get('error', 'Unknown error occurred'),
                'message': result.get('message', 'Failed to update product')
            })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON format'})
    except Exception as e:
        print("Error in update_fundraising_product:", e)
        return JsonResponse({'success': False, 'error': str(e)})

    
@csrf_exempt
def port_over(request):
    """Fetches and returns a list of products from WooCommerce based on the courseType."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        # Parse the request body as JSON
        data = json.loads(request.body)
        print("Data received Port Over:", data)

        # Get courseName from the request body and clean it up
        courseName = data.get('page')  # Assuming 'page' is where the course name is stored

        if courseName:
            # Format the course name details as a string for logging
            # Get the course name components
            chi_name = courseName.get('courseChiName', '')
            eng_name = courseName.get('courseEngName', '')
            location = courseName.get('courseLocation', '')
            print(chi_name+"<br />"+eng_name+"<br />"+location)

            # Initialize WooCommerce API and fetch the product ID
            woo_api = WooCommerceAPI()
            result = woo_api.getProductId(chi_name, eng_name, f"({location})")  # Use the formatted string
            print("Result:", result)

            if result['exist'] == True:
                print("Update Product Stocks")
                productId = result['id']
                print('Product Id:', result)
                result2 = woo_api.updatePortOver(productId)

                return JsonResponse({'success': result2})

        else:
            print("No course data found in the 'page' field.")

    except Exception as e:
        print("Error:", e)  # Log the error to the console
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
def upload_product_image(request):
    """Upload product image directly to WordPress Media Library using REST API."""
    print("DEBUG: upload_product_image called")
    print(f"DEBUG: Request method: {request.method}")
    
    if request.method != 'POST':
        print("DEBUG: Invalid method - not POST")
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})
    
    try:
        print("DEBUG: Checking for image file in request.FILES")
        print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
        print(f"DEBUG: request.POST keys: {list(request.POST.keys())}")
        print(f"DEBUG: Content-Type: {request.content_type}")
        
        # Check if image file is in the request (check both 'image' and 'file' keys)
        image_file = None
        if 'image' in request.FILES:
            image_file = request.FILES['image']
            print("DEBUG: Found image file with 'image' key")
        elif 'file' in request.FILES:
            image_file = request.FILES['file']
            print("DEBUG: Found image file with 'file' key")
        else:
            print("DEBUG: No image file found with 'image' or 'file' key")
            return JsonResponse({'success': False, 'error': 'No image file provided'})
        
        print(f"DEBUG: Image file found - name: {image_file.name}, size: {image_file.size}, content_type: {image_file.content_type}")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
        print(f"DEBUG: Validating file type. Content type: {image_file.content_type}")
        if image_file.content_type not in allowed_types:
            print(f"DEBUG: Invalid file type: {image_file.content_type}")
            return JsonResponse({'success': False, 'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'})
        
        # Validate file size (2MB limit to match WordPress)
        max_size = 2 * 1024 * 1024  # 2MB in bytes
        print(f"DEBUG: Validating file size. Size: {image_file.size}, Max: {max_size}")
        if image_file.size > max_size:
            print(f"DEBUG: File too large: {image_file.size} bytes")
            return JsonResponse({'success': False, 'error': 'File size too large. Maximum 2MB allowed to match WordPress limits.'})
        
        # Process image to prevent WordPress from creating scaled versions
        from PIL import Image
        import io
        
        # Reset file pointer and read the image
        image_file.seek(0)
        original_image = Image.open(image_file)
        
        # WordPress creates scaled versions for images larger than 2560px
        # Resize if the image is too large to prevent scaling
        max_dimension = 2560
        width, height = original_image.size
        
        if width > max_dimension or height > max_dimension:
            # Calculate new dimensions maintaining aspect ratio
            if width > height:
                new_width = max_dimension
                new_height = int((height * max_dimension) / width)
            else:
                new_height = max_dimension
                new_width = int((width * max_dimension) / height)
            
            print(f"DEBUG: Resizing image from {width}x{height} to {new_width}x{new_height}")
            resized_image = original_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        else:
            print(f"DEBUG: Image size {width}x{height} is within limits, no resizing needed")
            resized_image = original_image
        
        # Convert back to bytes for upload
        output = io.BytesIO()
        # Preserve original format
        format = original_image.format or 'JPEG'
        if format == 'JPEG':
            resized_image.save(output, format='JPEG', quality=95, optimize=True)
        else:
            resized_image.save(output, format=format, optimize=True)
        
        file_content = output.getvalue()
        print(f"DEBUG: Processed image size: {len(file_content)} bytes")
        
        # Upload to WordPress using REST API directly
        import requests
        import base64
        
        # WordPress REST API endpoint
        wp_url = "https://ecss.org.sg/wp-json/wp/v2/media"
        
        # WordPress credentials - using Application Password
        username = "encommunity"
        # Application Password (remove spaces)
        app_password = "8aiteLJsa7fV5eFePP5ym8Zv"
        
        print("DEBUG: Using WordPress Application Password for authentication")
        print(f"DEBUG: Username: {username}")
        print(f"DEBUG: App Password length: {len(app_password)} characters")
        
        # Create basic auth header with Application Password
        credentials = base64.b64encode(f"{username}:{app_password}".encode()).decode()
        
        # Try different approach - use files parameter for multipart upload
        original_filename = image_file.name
        print(f"DEBUG: Original filename: '{original_filename}'")
        
        files = {'file': (original_filename, file_content, image_file.content_type)}
        
        # Prepare headers for WordPress API (simpler headers for files upload)
        headers = {
            'Authorization': f'Basic {credentials}',
            'User-Agent': 'Django-WP-Upload/1.0'
        }
        
        print("DEBUG: Uploading to WordPress via REST API using files parameter")
        print(f"DEBUG: Sending file: '{original_filename}', content-type: {image_file.content_type}")
        
        # Make the request to WordPress using files parameter
        response = requests.post(wp_url, headers=headers, files=files)
        
        print(f"DEBUG: WordPress API response status: {response.status_code}")
        print(f"DEBUG: WordPress API response headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            # Success
            wp_response = response.json()
            
            # Get the image URL and media ID from WordPress response
            image_url = wp_response.get('source_url', '')
            media_id = wp_response.get('id', '')
            
            print(f"DEBUG: Image uploaded successfully - ID: {media_id}, URL: {image_url}")
            
            return JsonResponse({
                'success': True,
                'image_url': image_url,
                'media_id': media_id,
                'filename': original_filename,
                'message': 'Image uploaded to WordPress Media Library successfully'
            })
        else:
            # Error response
            error_message = f"WordPress upload failed with status {response.status_code}"
            try:
                error_data = response.json()
                error_message += f": {error_data.get('message', 'Unknown error')}"
                print(f"DEBUG: Error details: {error_data}")
            except:
                error_message += f": {response.text}"
                print(f"DEBUG: Raw error response: {response.text}")
            
            return JsonResponse({
                'success': False,
                'error': error_message
            })
        
    except Exception as e:
        print("DEBUG: Exception occurred in upload_product_image")
        print("Error in upload_product_image:", e)
        return JsonResponse({'success': False, 'error': str(e)})
