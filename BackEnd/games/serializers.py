"""
Serializers for games app.

Supports proposal section: "Games & AI Learning Modules"
Games: Pattern Puzzler, Decision Maze, Prediction Station, Sorting Adventure, AI Story Builder
"""

from rest_framework import serializers


class GameProgressSerializer(serializers.Serializer):
    """Serializer for game progress data."""
    game_id = serializers.CharField()
    student_id = serializers.CharField()
    score = serializers.FloatField()
    difficulty_level = serializers.IntegerField()
    attempts = serializers.IntegerField()
    completed = serializers.BooleanField()
    timestamp = serializers.DateTimeField(required=False)


class GameAttemptSerializer(serializers.Serializer):
    """Serializer for submitting game attempt."""
    game_id = serializers.CharField(required=True)
    score = serializers.FloatField(required=True)
    difficulty_level = serializers.IntegerField(required=True)
    completed = serializers.BooleanField(default=False)
    game_data = serializers.DictField(required=False, help_text="Game-specific data")


class GameListSerializer(serializers.Serializer):
    """Serializer for listing available games."""
    game_id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    ai_concept = serializers.CharField()
    difficulty_levels = serializers.ListField(child=serializers.IntegerField())


class GameStatsSerializer(serializers.Serializer):
    """Serializer for game statistics."""
    game_id = serializers.CharField()
    total_attempts = serializers.IntegerField()
    best_score = serializers.FloatField()
    average_score = serializers.FloatField()
    completion_rate = serializers.FloatField()
    current_difficulty = serializers.IntegerField()
