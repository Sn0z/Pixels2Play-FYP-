"""
URL configuration for eye_tracker app.

Mount under /api/eye-tracker/ in project urls.py.
"""

from django.urls import path
from eye_tracker.views import (
    StartSessionView,
    StopSessionView,
    ProcessFrameView,
    StatusView,
)

urlpatterns = [
    path("start/", StartSessionView.as_view(), name="eye_tracker_start"),
    path("stop/", StopSessionView.as_view(), name="eye_tracker_stop"),
    path("process-frame/", ProcessFrameView.as_view(), name="eye_tracker_process_frame"),
    path("status/", StatusView.as_view(), name="eye_tracker_status"),
]
