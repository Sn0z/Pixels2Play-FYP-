from django.urls import path
from .views import (
    module_list,
    module_detail,
    update_watch,
    quiz,
    submit_quiz,
    module_status,
    module_analytics,
    request_parent_link,
    parent_links,
    approve_link,
)

urlpatterns = [
    path("modules/", module_list),
    path("modules/<int:module_id>/", module_detail),
    path("modules/<int:module_id>/watch/", update_watch),
    path("modules/<int:module_id>/quiz/", quiz),
    path("modules/<int:module_id>/quiz/submit/", submit_quiz),
    path("modules/<int:module_id>/status/", module_status),
    path("modules/<int:module_id>/analytics/", module_analytics),

    # Parent-child linking endpoints
    path("parent-link/request/", request_parent_link),
    path("parent-link/approve/", approve_link),
    path("parent-link/", parent_links),
]
