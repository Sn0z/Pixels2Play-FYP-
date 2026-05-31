"""
URL configuration for family app.
"""

from django.urls import path
from family.views import link_parent_child, get_family_links

urlpatterns = [
    path('link', link_parent_child, name='link_parent_child'),
    path('links', get_family_links, name='get_family_links'),
]
