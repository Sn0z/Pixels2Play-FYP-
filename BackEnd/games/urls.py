"""
URL configuration for games app.
"""

from django.urls import path
from games.views import (
    list_games,
    submit_game_attempt,
    get_my_game_progress,
    get_game_stats,
    get_child_game_progress,
)

urlpatterns = [
    path('', list_games, name='list_games'),
    path('attempt/', submit_game_attempt, name='submit_game_attempt'),
    path('progress/', get_my_game_progress, name='get_my_game_progress'),
    path('stats/<str:game_id>/', get_game_stats, name='get_game_stats'),
    path('child/<str:child_id>/progress/', get_child_game_progress, name='get_child_game_progress'),
]
