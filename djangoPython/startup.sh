#!/bin/bash

echo "Starting Django application..."

# Set environment variables
export DJANGO_SETTINGS_MODULE=djangoPython.settings

# Navigate to the Django project directory
cd /home/site/wwwroot

# Collect static files (if needed)
python manage.py collectstatic --noinput || echo "Static files collection failed or not needed"

# Run database migrations (if needed)
python manage.py migrate --noinput || echo "Migrations failed or not needed"

# Start Gunicorn server
echo "Starting Gunicorn server..."
gunicorn --bind 0.0.0.0:8000 \
         --workers 4 \
         --timeout 120 \
         --keep-alive 2 \
         --max-requests 1000 \
         --max-requests-jitter 100 \
         --preload \
         --access-logfile - \
         --error-logfile - \
         --log-level info \
         djangoPython.wsgi:application