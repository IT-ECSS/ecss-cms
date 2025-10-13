from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
import os
import json

def robots_txt(request):
    """Serves the robots.txt file"""
    try:
        robots_path = os.path.join(settings.BASE_DIR, 'static', 'robots.txt')
        with open(robots_path, 'r') as f:
            content = f.read()
        return HttpResponse(content, content_type='text/plain')
    except FileNotFoundError:
        # Fallback robots.txt content
        content = """User-agent: *
Allow: /

Disallow: /admin/
"""
        return HttpResponse(content, content_type='text/plain')


def health_check(request):
    """Health check endpoint for Azure App Service"""
    try:
        from django.db import connection
        
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "OK"
        
        # Basic health info
        health_data = {
            "status": "healthy",
            "database": db_status,
            "timestamp": str(timezone.now()),
            "version": "1.0.0"
        }
        
        return HttpResponse(
            json.dumps(health_data, indent=2),
            content_type='application/json',
            status=200
        )
    except Exception as e:
        error_data = {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": str(timezone.now())
        }
        return HttpResponse(
            json.dumps(error_data, indent=2),
            content_type='application/json',
            status=503
        )