"""
URL configuration for analytics app.
"""

from django.urls import path
from analytics.views import (
    engagement_metrics,
    completion_rates,
    attention_trends,
)

urlpatterns = [
    path('engagement/', engagement_metrics, name='engagement_metrics'),
    path('completion-rates/', completion_rates, name='completion_rates'),
    path('attention-trends/', attention_trends, name='attention_trends'),
]
