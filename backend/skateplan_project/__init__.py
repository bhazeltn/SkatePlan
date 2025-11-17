# This file was created by `django-admin startproject`.
# We are OVERWRITING it to load Celery.

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ("celery_app",)
