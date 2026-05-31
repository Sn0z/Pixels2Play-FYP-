"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # From Pixels to Play API endpoints
    path("api/", include("users.urls")),  # /api/auth/login, /api/users/me
    path("api/family/", include("family.urls")),  # /api/family/link, /api/family/links
    path("api/games/", include("games.urls")),  # /api/games/* - Learning games for children
    path("api/progress/", include("progress.urls")),  # /api/progress/* - Progress Tracking
    path("api/analytics/", include("analytics.urls")),  # /api/analytics/* - Admin Analytics
    path("api/evaluation/", include("evaluation.urls")),  # /api/evaluation/* - Research Evaluation
    # Existing endpoints
    path("api/payments/", include("payments.urls")),  # /api/payments/* - Khalti Payments
    path("api/courses/", include("courses.urls")),  # /api/courses/* - Video Courses
    path("api/eye-tracker/", include("eye_tracker.urls")),  # /api/eye-tracker/* - Eye tracking
]
