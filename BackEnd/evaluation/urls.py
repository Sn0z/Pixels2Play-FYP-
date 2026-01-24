"""
URL configuration for evaluation app.
"""

from django.urls import path
from evaluation.views import (
    submit_evaluation,
    get_my_evaluation,
    get_all_evaluations,
)

urlpatterns = [
    path('submit/', submit_evaluation, name='submit_evaluation'),
    path('', get_my_evaluation, name='get_my_evaluation'),
    path('all/', get_all_evaluations, name='get_all_evaluations'),
]
