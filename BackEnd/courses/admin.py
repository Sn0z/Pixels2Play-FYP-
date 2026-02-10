from django.contrib import admin
from .models import Module, QuizQuestion, QuizChoice, UserModuleProgress, ParentChildLink, WatchEvent, AttentionEvent


class QuizChoiceInline(admin.TabularInline):
    """Inline editing for quiz choices within a question"""
    model = QuizChoice
    extra = 4  # Show 4 empty choice fields by default
    fields = ('text', 'is_correct')


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    """Admin interface for quiz questions"""
    list_display = ('id', 'module', 'text_preview', 'num_choices', 'has_correct_answer')
    list_filter = ('module',)
    search_fields = ('text',)
    inlines = [QuizChoiceInline]
    
    def text_preview(self, obj):
        """Show first 60 characters of question text"""
        return obj.text[:60] + ('...' if len(obj.text) > 60 else '')
    text_preview.short_description = 'Question Text'
    
    def num_choices(self, obj):
        """Count number of choices for this question"""
        return obj.choices.count()
    num_choices.short_description = '# Choices'
    
    def has_correct_answer(self, obj):
        """Check if at least one choice is marked correct"""
        return obj.choices.filter(is_correct=True).exists()
    has_correct_answer.boolean = True
    has_correct_answer.short_description = 'Has Correct Answer'


class QuizQuestionInline(admin.StackedInline):
    """Inline editing for quiz questions within a module (collapsed by default)"""
    model = QuizQuestion
    extra = 0  # Don't show empty forms by default
    show_change_link = True  # Link to full question admin for detailed editing
    fields = ('text',)


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """Enhanced admin interface for course modules"""
    list_display = ('title', 'order', 'category', 'price_display', 'video_host', 'duration_display', 'num_questions', 'published', 'created_students_count')
    list_filter = ('published', 'video_host', 'category')
    search_fields = ('title', 'description', 'short_description')
    ordering = ('order',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'order', 'published', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'currency')
        }),
        ('Course Details', {
            'fields': ('age_min', 'age_max', 'duration_weeks', 'format_type', 'course_image'),
            'description': 'Metadata for course display on detail pages'
        }),
        ('Course Descriptions', {
            'fields': ('short_description', 'long_description', 'description'),
            'description': 'short_description: shown on course card. long_description: shown in "About" section. description: legacy field.'
        }),
        ('Video Configuration', {
            'fields': ('video_host', 'video_url', 'video_duration')
        }),
        ('Completion Requirements', {
            'fields': ('required_percent', 'quiz_passing_score'),
            'description': 'required_percent: portion of video that must be watched (0.95 = 95%). quiz_passing_score: minimum quiz score to pass (0.7 = 70%)'
        }),
        ('UI Icons (Optional)', {
            'fields': ('icon_age', 'icon_duration', 'icon_format', 'icon_certificate'),
            'classes': ('collapse',),
            'description': 'Icon URLs for course details. Leave blank to use defaults.'
        }),
    )
    
    # Note: QuizQuestionInline removed from here - too complex for inline editing
    # Use the "Add Quiz Question" button or edit questions separately
    
    def duration_display(self, obj):
        """Format video duration as MM:SS"""
        minutes = int(obj.video_duration // 60)
        seconds = int(obj.video_duration % 60)
        return f"{minutes}:{seconds:02d}"
    duration_display.short_description = 'Duration'
    
    def price_display(self, obj):
        """Format price with currency"""
        return f"{obj.currency} {obj.price}"
    price_display.short_description = 'Price'
    
    def num_questions(self, obj):
        """Count quiz questions for this module"""
        return obj.questions.count()
    num_questions.short_description = '# Questions'
    
    def created_students_count(self, obj):
        """Count students who have progress on this module"""
        return UserModuleProgress.objects.filter(module=obj).values('firebase_uid').distinct().count()
    created_students_count.short_description = 'Students Enrolled'


@admin.register(QuizChoice)
class QuizChoiceAdmin(admin.ModelAdmin):
    """Admin interface for individual quiz choices (rarely used directly)"""
    list_display = ('id', 'question', 'text_preview', 'is_correct')
    list_filter = ('is_correct', 'question__module')
    search_fields = ('text',)
    
    def text_preview(self, obj):
        return obj.text[:60] + ('...' if len(obj.text) > 60 else '')
    text_preview.short_description = 'Choice Text'


@admin.register(UserModuleProgress)
class UserModuleProgressAdmin(admin.ModelAdmin):
    """Admin interface for tracking student progress"""
    list_display = ('firebase_uid', 'module', 'progress_percent', 'quiz_score_percent', 'completed', 'ended')
    list_filter = ('completed', 'ended', 'module')
    search_fields = ('firebase_uid',)
    readonly_fields = ('updated_at',)
    
    def progress_percent(self, obj):
        """Show watch progress as percentage"""
        if obj.module.video_duration == 0:
            return "N/A"
        percent = (obj.max_watched_seconds / obj.module.video_duration) * 100
        return f"{percent:.1f}%"
    progress_percent.short_description = 'Watch Progress'
    
    def quiz_score_percent(self, obj):
        """Show quiz score as percentage"""
        if obj.quiz_score is None:
            return "Not taken"
        return f"{obj.quiz_score * 100:.1f}%"
    quiz_score_percent.short_description = 'Quiz Score'


@admin.register(ParentChildLink)
class ParentChildLinkAdmin(admin.ModelAdmin):
    """Admin interface for parent-child account links"""
    list_display = ('parent_uid', 'child_uid', 'approved', 'created_at')
    list_filter = ('approved',)
    search_fields = ('parent_uid', 'child_uid')
    readonly_fields = ('created_at',)


@admin.register(WatchEvent)
class WatchEventAdmin(admin.ModelAdmin):
    """Admin interface for watch tracking events"""
    list_display = ('firebase_uid', 'module', 'current_time', 'created_at')
    list_filter = ('module', 'created_at')
    search_fields = ('firebase_uid',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    # Limitqueryset for performance
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('module')


@admin.register(AttentionEvent)
class AttentionEventAdmin(admin.ModelAdmin):
    """Admin interface for eye tracking attention events"""
    list_display = ('firebase_uid', 'module', 'status', 'created_at', 'note')
    list_filter = ('status', 'module', 'created_at')
    search_fields = ('firebase_uid', 'note')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    # Limit queryset for performance
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('module')

