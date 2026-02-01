"""
URL configuration for users app.
"""

from django.urls import path
from users.views import (
    login, signup, password_reset, get_current_user,
    search_user_by_email, firebase_health_check,
    send_otp, verify_otp,
)

urlpatterns = [
    # Auth endpoints: /api/auth/signup, /api/auth/login, /api/auth/password-reset
    path('auth/signup', signup, name='signup'),
    path('auth/login', login, name='login'),
    path('auth/password-reset', password_reset, name='password_reset'),
    # OTP (email SMTP): /api/auth/otp/send, /api/auth/otp/verify
    path('auth/otp/send', send_otp, name='send_otp'),
    path('auth/otp/verify', verify_otp, name='verify_otp'),
    # User endpoints: /api/users/me, /api/users/search
    path('users/me', get_current_user, name='current_user'),
    path('users/search', search_user_by_email, name='search_user_by_email'),
    # Health check: /api/health/firebase
    path('health/firebase', firebase_health_check, name='firebase_health_check'),
]
