import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bsc_ai.settings')

app = Celery('bsc_ai')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
