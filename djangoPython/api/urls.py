from django.urls import path
from . import views

urlpatterns = [
    path('courses/', views.product_list, name='product_list'),
    path('fundraising/', views.fundraising_list, name='fundraising_list'),
    path('fundraising_product_details/', views.fundraising_product_details, name='fundraising_product_details'),
    path('course_report_draft/', views.product_stock_dashboard, name='all_product_list'),
    path('course_report/', views.product_stock_dashboard_react, name='all_product_list_react'),
    path('sales_report_draft/', views.sales_report_view, name='working_with_database'),
    path('sales_report/', views.sales_report_view_react, name='sales_report_react'),
    path('generate_monthly_report/', views.generate_report, name='generate_report'),
    path('update_stock/', views.update_stock, name='update_stock'),
    path('update_fundraising_product/', views.update_fundraising_product, name='update_fundraising_product'),
    path('port_over/', views.port_over, name='port_over'),
    path('upload-product-image/', views.upload_product_image, name='upload_product_image'),
]