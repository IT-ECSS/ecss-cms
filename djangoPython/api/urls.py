from django.urls import path
from . import views

urlpatterns = [
    path('inventory_sse/', views.inventory_sse, name='inventory_sse'),  # SSE for live inventory updates
    path('courses/', views.product_list, name='product_list'),
    path('fundraising/', views.fundraising_list, name='fundraising_list'),
    path('fundraising_product_details/', views.fundraising_product_details, name='fundraising_product_details'),
    path('inventory_product_details/', views.inventory_product_details, name='inventory_product_details'),
    path('inventory_order/', views.inventory_order, name='inventory_order'),
    path('inventory_incoming/', views.inventory_incoming, name='inventory_incoming'),
    path('inventory_allocate/', views.inventory_allocate, name='inventory_allocate'),
    path('inventory_stock_adjustment/', views.inventory_stock_adjustment, name='inventory_stock_adjustment'),
    path('course_report_draft/', views.product_stock_dashboard, name='all_product_list'),
    path('course_report/', views.product_stock_dashboard_react, name='all_product_list_react'),
    path('sales_report_draft/', views.sales_report_view, name='working_with_database'),
    path('sales_report/', views.sales_report_view_react, name='sales_report_react'),
    path('generate_monthly_report/', views.generate_report, name='generate_report'),
    path('update_stock/', views.update_stock, name='update_stock'),
    path('update_fundraising_product_stock/', views.update_fundraising_product_stock, name='update_fundraising_product_stock'),
    path('update_fundraising_product_details/', views.update_fundraising_product_details, name='update_fundraising_product_details'),
    path('port_over/', views.port_over, name='port_over'),
    path('upload-product-image/', views.upload_product_image, name='upload_product_image'),
]