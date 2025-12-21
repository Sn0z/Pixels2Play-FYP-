from django.db import models

class Payment(models.Model):
    firebase_uid = models.CharField(max_length=128)
    course_id = models.CharField(max_length=100)
    amount = models.IntegerField()  
    khalti_pidx = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.firebase_uid} - {self.course_id}"
