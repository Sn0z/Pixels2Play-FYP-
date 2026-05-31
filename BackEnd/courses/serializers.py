from rest_framework import serializers
from .models import Module, QuizQuestion, QuizChoice, UserModuleProgress, ParentChildLink


class QuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ['id', 'text']


class QuizQuestionSerializer(serializers.ModelSerializer):
    choices = QuizChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'text', 'choices']


class ModuleSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = [
            'id', 'title', 'description', 'order', 'published',
            'video_url', 'video_host', 'video_duration',
            'required_percent', 'quiz_passing_score',
            # Course metadata
            'category', 'price', 'currency',
            'age_min', 'age_max', 'duration_weeks', 'format_type',
            'course_image', 'short_description', 'long_description',
            'icon_age', 'icon_duration', 'icon_format', 'icon_certificate',
            # Quiz questions
            'questions'
        ]


class UserModuleProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModuleProgress
        fields = ['module', 'max_watched_seconds', 'quiz_score', 'completed', 'updated_at']


class ParentChildLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentChildLink
        fields = ['id', 'parent_uid', 'child_uid', 'approved', 'created_at']
