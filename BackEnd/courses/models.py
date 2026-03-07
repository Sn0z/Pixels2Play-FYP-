from django.db import models


class Module(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    VIDEO_HOST_CHOICES = [
        ('youtube', 'YouTube'),
        ('vimeo', 'Vimeo'),
        ('custom', 'Custom'),
    ]

    video_url = models.CharField(max_length=1024)
    video_host = models.CharField(max_length=20, choices=VIDEO_HOST_CHOICES, default='youtube')
    video_duration = models.FloatField(default=0.0)  # seconds
    required_percent = models.FloatField(default=0.95)
    quiz_passing_score = models.FloatField(default=0.7)
    published = models.BooleanField(default=True)

    # Firestore document ID – used to link this Module stub to a Firestore course
    firestore_id = models.CharField(max_length=128, blank=True, null=True, unique=True)

    # Course-level metadata
    category = models.CharField(max_length=100, default='Coding')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=99.00)
    currency = models.CharField(max_length=10, default='Rs')
    age_min = models.IntegerField(default=8)
    age_max = models.IntegerField(default=12)
    duration_weeks = models.IntegerField(default=6)
    format_type = models.CharField(max_length=100, default='Live Online Classes')
    course_image = models.URLField(max_length=1024, blank=True)
    short_description = models.TextField(blank=True)
    long_description = models.TextField(blank=True)
    
    # Icon URLs for course details display
    icon_age = models.URLField(max_length=1024, blank=True, default='https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-4.svg')
    icon_duration = models.URLField(max_length=1024, blank=True, default='https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image.svg')
    icon_format = models.URLField(max_length=1024, blank=True, default='https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-1.svg')
    icon_certificate = models.URLField(max_length=1024, blank=True, default='https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-3.svg')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()

    def __str__(self):
        return f"Q: {self.text[:50]}"


class QuizChoice(models.Model):
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=512)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class UserModuleProgress(models.Model):
    firebase_uid = models.CharField(max_length=128)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    max_watched_seconds = models.FloatField(default=0.0)
    quiz_score = models.FloatField(null=True)
    completed = models.BooleanField(default=False)
    away_start = models.DateTimeField(null=True, blank=True)
    ended = models.BooleanField(default=False)
    ended_reason = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('firebase_uid', 'module')

    def __str__(self):
        return f"{self.firebase_uid} - {self.module.title}"


class AttentionEvent(models.Model):
    STATUS_CHOICES = [
        ('LOOKING', 'Looking'),
        ('NOT_LOOKING', 'Not Looking'),
        ('AWAY_ALERT', 'Away Alert')
    ]

    firebase_uid = models.CharField(max_length=128)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.firebase_uid} - {self.module.title} - {self.status} @ {self.created_at}"

class ParentChildLink(models.Model):
    parent_uid = models.CharField(max_length=128)
    child_uid = models.CharField(max_length=128)
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('parent_uid', 'child_uid')

    def __str__(self):
        return f"{self.parent_uid} -> {self.child_uid} ({'approved' if self.approved else 'pending'})"


class WatchEvent(models.Model):
    firebase_uid = models.CharField(max_length=128)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    current_time = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.firebase_uid} - {self.module.title} @ {self.current_time}s"
