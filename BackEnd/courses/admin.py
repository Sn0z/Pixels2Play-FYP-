from django.contrib import admin
from .models import Module, QuizQuestion, QuizChoice, UserModuleProgress, ParentChildLink, WatchEvent, AttentionEvent


class ChoiceInline(admin.TabularInline):
    model = QuizChoice
    extra = 1


class QuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'video_host', 'video_duration', 'published')
    inlines = [QuestionInline]
    fields = ('title', 'description', 'order', 'video_host', 'video_url', 'video_duration', 'required_percent', 'quiz_passing_score', 'published')


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'module', 'text')
    inlines = [ChoiceInline]


admin.site.register(QuizChoice)
admin.site.register(UserModuleProgress)
admin.site.register(ParentChildLink)
admin.site.register(WatchEvent)
admin.site.register(AttentionEvent)
