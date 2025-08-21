from django.http import JsonResponse, HttpResponse
from .services import WooCommerceAPI
from django.views.decorators.csrf import csrf_exempt  # Temporarily disable CSRF validation for this view

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
        print("Course Type:", courseType)

        # Initialize WooCommerce API instance
        woo_api = WooCommerceAPI()

        # Fetch products based on courseType
        if courseType == "NSA":
            products = woo_api.get_nsa_products()
        elif courseType == "ILP":
            products = woo_api.get_ilp_products()
        elif courseType == "Marriage Preparation Programme":
            print("Hello, fetching Marriage Preparation Programme products...")
            #products = woo_api.get_marriage_prep_products()
        else:
            # Handle cases where no valid courseType is provided
            products = woo_api.get_nsa_products() + woo_api.get_ilp_products() + woo_api.get_marriage_prep_products()

        #print(products)

        # Return the products as a JSON response
        return JsonResponse({"courses": products})

    except json.JSONDecodeError:
         JsonResponse({"error": "Invalid JSON input."}, status=400)

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

from collections import defaultdict
from datetime import datetime
from pymongo import MongoClient
from django.shortcuts import render

@csrf_exempt
def generate_invoice_view(request):
    # MongoDB connection
    client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
    db = client["Company-Management-System"]
    collection = db["Registration Forms"]

    p = inflect.engine()

    # Filter for course.payment = "SkillsFuture", status = "Paid", and receiptNo is not empty
    query = {
        "course.payment": "SkillsFuture",
        "status": "Paid",
        "official.receiptNo": {"$ne": ""}
    }

    # Retrieve the filtered documents
    documents = list(collection.find(query))

    # Aggregation dictionary to store the data in the desired format
    course_data = defaultdict(lambda: {
        "courses": [],  # List of courses under this paymentDate
        "total_price": 0  # Initialize total_price for each paymentDate
    })

    # Temporary dictionary to track course counts and accumulated total prices
    course_accumulation = defaultdict(lambda: {"count": 0, "total_price": 0})

    # To track courses and avoid duplicates later
    seen_courses = set()

    for doc in documents:
        # Extract courseEngName (course name)
        course_eng_name = doc["course"].get("courseEngName", None)
        course_location = doc["course"].get("courseLocation", None)
        if not course_eng_name:
            continue  # Skip this document if no course name is found

        # Extract price
        course_price = doc["course"].get("coursePrice", 0)

        # Check if the price is in string format with '$' sign and convert to float
        if isinstance(course_price, str) and course_price.startswith('$'):
            course_price = float(course_price.replace('$', '').strip())

        # Round to 2 decimal places using float for precision
        course_price *= 5
        course_price = round(course_price, 2)

        # Convert the course price to string format '$x.xx'
        course_price_str = f"${course_price:.2f}"

        # Extract number of people (default to 1 if not present)
        no_of_people = doc["course"].get("numberOfPeople", 1)

        # Calculate the total price for this course (price * number of people)
        total_price = course_price * no_of_people
        total_price = round(total_price, 2)  # Round to 2 decimal places

        # Convert the total price to string format '$x.xx'
        total_price_str = f"${total_price:.2f}"

        # Extract and process courseDuration
        course_duration_raw = doc["course"].get("courseDuration", None)
        formatted_start_date = None
        formatted_end_date = None

        if course_duration_raw:
            try:
                # Expecting "dd MMMM yyyy - dd MMMM yyyy"
                start_raw, end_raw = course_duration_raw.split(" - ")
                start_date = datetime.strptime(start_raw, "%d %B %Y")
                end_date = datetime.strptime(end_raw, "%d %B %Y")

                # Custom formatting without leading zeros for day and month
                formatted_start_date = f"{start_date.day}.{start_date.month}.{start_date.year}"
                formatted_end_date = f"{end_date.day}.{end_date.month}.{end_date.year}" if end_date else None
            except (ValueError, IndexError):
                pass  # If parsing fails, leave dates as None

        # Extract official.date in dd/mm/yyyy format and parse it
        official_date_raw = doc["official"].get("date", None)
        formatted_month_year = None

        if official_date_raw:
            try:
                official_date = datetime.strptime(official_date_raw, "%d/%m/%Y")
                formatted_month_year = official_date.strftime("%B %Y")  # Format as "Month YYYY"
            except ValueError:
                pass  # If parsing fails, leave formatted_month_year as None

        # Use the entry_counter as the primary key
        if formatted_month_year:
            payment_date = formatted_month_year
        else:
            payment_date = "Unknown Month-Year"

        # Create a unique identifier for each course based on course name, location, and date range
        course_key = (course_eng_name, course_location, formatted_start_date, formatted_end_date)

        # Track the course count and accumulate total price
        course_accumulation[course_key]["count"] += no_of_people
        course_accumulation[course_key]["total_price"] += total_price

        # Add the course details to the course data for later filtering
        course_details = {
            "course": course_eng_name,
            "location": course_location,
            "details": {
                "price": course_price_str,  # Original price * 5, as a formatted string
                "total_price": total_price_str,  # total_price = price * 5 * number of people, formatted
                "startDate": formatted_start_date,
                "endDate": formatted_end_date
            }
        }

        if course_key not in seen_courses:
            seen_courses.add(course_key)
            course_data[payment_date]["courses"].append(course_details)

    # Clean up the data to remove None or empty fields
    cleaned_course_data = {}
    for payment_date, data in course_data.items():
        # Only include non-empty courses under each paymentDate
        filtered_courses = []
        for course in data["courses"]:
            course_key = (course["course"], course["location"], course["details"]["startDate"], course["details"]["endDate"])
            # Get the count and total price for this course key
            count = course_accumulation[course_key]["count"]
            total_price = course_accumulation[course_key]["total_price"]

            # Add course to the filtered list if it has valid data
            if course["course"] and any(v is not None and v != "" for v in course["details"].values()):
                course["details"]["total_price"] = f"${total_price:.2f}"  # Format total price as string
                course["details"]["count"] = count
                filtered_courses.append(course)

        # If there are any valid courses for this payment date, include them
        if filtered_courses:
            cleaned_course_data[payment_date] = {
                "courses": filtered_courses,
                "total_price": 0  # Placeholder for total price
            }

    # Calculate the total price for each payment date and convert it to words
    for payment_date, data in cleaned_course_data.items():
        for course in data["courses"]:
            # Add the total price for this course to the payment date's overall total
            data["total_price"] += float(course["details"]["total_price"].replace('$', '').replace(',', '').strip())

        # Convert the total price to string and format as "$x.xx"
        cleaned_course_data[payment_date]["total_price"] = f"${data['total_price']:.2f}"

        price_value = float(data['total_price'].replace('$', '').replace(',', '').strip())

        # Split the price into dollars and cents
        dollars = int(price_value)
        cents = round((price_value - dollars) * 100)  # Round to the nearest cent

        # Convert the dollars to words
        dollars_in_words = p.number_to_words(dollars)

        if cents > 0:
            cents_in_words = p.number_to_words(cents)
            price_in_words = f"{dollars_in_words} and {cents_in_words} Only"
        else:
            price_in_words = f"{dollars_in_words} Only"

        # Update the total price in words
        price_in_words = ' '.join([word.capitalize() for word in price_in_words.split()])

        # Update the total price in words for the payment date
        cleaned_course_data[payment_date]["total_price_in_words"] = price_in_words

    # Pass the cleaned data to the template
    print(cleaned_course_data)
    return render(request, 'woocommerce/invoice_view.html', {'course_data': cleaned_course_data})

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
def generate_report(request):
    # MongoDB connection
    #client = MongoClient("mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System")
    #db = client["Company-Management-System"]
    #collection = db["Registration Forms"]

    """Fetches and returns a list of products from WooCommerce based on the courseType."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method, please use POST'})

    try:
        # Parse the request body as JSON if needed
        # data = json.loads(request.body)  # Uncomment if you need to parse data

        print("Gathering Data For Monthly Report")

        # Your code for fetching data goes here
        # For example, assuming you're fetching from WooCommerce or doing some processing
        # result = fetch_woocommerce_data(course_type)

        # Mock output for demonstration
        result = {'status': 'success', 'message': 'Data fetched successfully'}  # Replace with actual result
        
        print(result)  # This will print the output

        return JsonResponse({'success': True, 'data': result})

    except Exception as e:
        print("Error:", e)  # Log the error to the console
        return JsonResponse({'success': False, 'error': str(e)})

   

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
                result2 = woo_api.u(productId, status)

                print(status)

                return JsonResponse({'success': result2})

        else:
            print("No course data found in the 'page' field.")

    except Exception as e:
        print("Error:", e)  # Log the error to the console
        return JsonResponse({'success': False, 'error': str(e)})


