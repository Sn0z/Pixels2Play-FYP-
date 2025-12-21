from django.urls import path
from .views import initiate_payment, verify_payment, course_purchase_status

urlpatterns = [
    path("initiate/", initiate_payment),
    path("verify/", verify_payment),
    path("course-status/<str:course_id>/", course_purchase_status),
]
