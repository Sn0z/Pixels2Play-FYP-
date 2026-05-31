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
    firestore_courses_list,
    firestore_course_detail,
    firestore_modules_list,
    firestore_module_detail,
    purchase_course,
    purchased_courses,
    child_purchased_courses,
    child_progress,
    course_activity,
)

urlpatterns = [
    # Firestore courses proxy (reads from Firestore, served via Django)
    path("firestore-courses/", firestore_courses_list),
    path("firestore-courses/<str:course_id>/", firestore_course_detail),
    
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

    # ── Purchase & Progress & Activity endpoints ──────────────────────────────────────
    path("purchase/", purchase_course, name="purchase-course"),
    path("purchased/", purchased_courses, name="purchased-courses"),
    path("child-courses/", child_purchased_courses, name="child-courses"),
    path("child-progress/<str:course_id>/", child_progress, name="child-progress"),
    path("activity/", course_activity, name="course-activity"),

    # Nested Firestore module endpoints — MUST come before the catch-all <course_id>/ pattern
    path("<str:course_id>/modules/", firestore_modules_list, name="course-modules-list"),
    path("<str:course_id>/modules/<str:module_id>/", firestore_module_detail, name="course-module-detail"),

    # Short aliases: GET /api/courses/  and  GET /api/courses/<id>/
    # IMPORTANT: these catch-all string patterns must come LAST
    # so they don't shadow the fixed prefixes above (modules/, firestore-courses/, etc.)
    path("", firestore_courses_list,            name="courses-list"),
    path("<str:course_id>/", firestore_course_detail, name="courses-detail"),
]
