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
