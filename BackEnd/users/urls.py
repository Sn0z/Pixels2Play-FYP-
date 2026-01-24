"""
URL configuration for users app.
"""

from django.urls import path
from users.views import login, get_current_user, search_user_by_email

urlpatterns = [
    path('auth/login', login, name='login'),
    path('users/me', get_current_user, name='current_user'),
    path('users/search', search_user_by_email, name='search_user_by_email'),
]
