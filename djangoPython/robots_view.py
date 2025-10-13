from django.http import HttpResponse
from django.conf import settings
import os

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