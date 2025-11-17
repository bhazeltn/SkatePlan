from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # --- THIS IS THE NEW LINE ---
    # It tells Django to send any request starting with 'api/'
    # to our new 'api.urls' file.
    path("api/", include("api.urls")),
]
