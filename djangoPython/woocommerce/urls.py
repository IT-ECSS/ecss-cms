from django.urls import path
from . import views

urlpatterns = [
    path('courses/', views.product_list, name='product_list'),
    path('course_report_draft/', views.product_stock_dashboard, name='all_product_list'),
    path('course_report/', views.product_stock_dashboard_react, name='all_product_list_react'),
    path('sales_report_draft/', views.sales_report_view, name='working_with_database'),
    path('sales_report/', views.sales_report_view_react, name='sales_report_react'),
    path('update_stock/', views.update_stock, name='update_stock'),
    path('reduce_stock/', views.update_stock, name='reduce_stock'),  # Alias for stock reduction
    path('generate_monthly_report/', views.generate_report, name='generate_report')
    #path('update_stock/', views.update_stock, name='update_stock')
]