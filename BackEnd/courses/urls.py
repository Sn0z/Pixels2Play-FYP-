from django.urls import path
from .views import (
    module_list,
    module_detail,
    update_watch,
    quiz,
    submit_quiz,
    module_status,
    module_analytics,
    import_module,
    request_parent_link,
    parent_links,
    approve_link,
    attention_event,
    attention_status,
)

urlpatterns = [
    path("modules/", module_list),
    path("modules/<int:module_id>/", module_detail),
    path("modules/<int:module_id>/watch/", update_watch),
    path("modules/<int:module_id>/quiz/", quiz),
    path("modules/<int:module_id>/quiz/submit/", submit_quiz),
    path("modules/<int:module_id>/status/", module_status),
    path("modules/<int:module_id>/analytics/", module_analytics),
    path("modules/<int:module_id>/attention/", attention_event),
    path("modules/<int:module_id>/attention-status/", attention_status),

    # Import / admin endpoints
    path("import/", import_module),

    # Parent-child linking endpoints
    path("parent-link/request/", request_parent_link),
    path("parent-link/approve/", approve_link),
    path("parent-link/", parent_links),
]
