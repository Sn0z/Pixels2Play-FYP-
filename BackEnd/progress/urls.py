"""
URL configuration for progress app.
"""

from django.urls import path
from progress.views import (
    get_my_progress,
    get_my_mastery,
    get_child_progress,
    get_child_mastery,
)

urlpatterns = [
    path('', get_my_progress, name='get_my_progress'),
    path('mastery/', get_my_mastery, name='get_my_mastery'),
    path('child/<str:child_id>/', get_child_progress, name='get_child_progress'),
    path('child/<str:child_id>/mastery/', get_child_mastery, name='get_child_mastery'),
]
