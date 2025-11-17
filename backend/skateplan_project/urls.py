# This file was created by `django-admin startproject`.
# We are OVERWRITING it.

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # We will create 'api.urls' in Phase 1
    # path('api/', include('api.urls')),
]
