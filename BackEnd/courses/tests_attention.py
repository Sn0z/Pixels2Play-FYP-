from django.test import TestCase
from unittest.mock import patch
from .models import Module, AttentionEvent, UserModuleProgress
import json

class AttentionAPITest(TestCase):
    def setUp(self):
        self.module = Module.objects.create(title='A', video_url='dQ', video_duration=60)

    @patch('courses.views.verify_firebase_token')
    def test_attention_flow_ends_after_60s(self, mock_verify):
        mock_verify.return_value = {'uid': 'child1'}
        from django.utils import timezone
        from django.test import Client
        client = Client()

        # Post NOT_LOOKING first
        res = client.post(f'/api/courses/modules/{self.module.id}/attention/', json.dumps({'status': 'NOT_LOOKING'}), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('action', res.json())
        self.assertEqual(res.json()['action'], 'pause')

        # Simulate an older created_at by updating the last event timestamp to 2 minutes ago
        last = AttentionEvent.objects.filter(firebase_uid='child1', module=self.module).order_by('-created_at').first()
        two_mins_ago = timezone.now() - timezone.timedelta(seconds=120)
        last.created_at = two_mins_ago
        last.save()

        # Now GET status should return end
        res = client.get(f'/api/courses/modules/{self.module.id}/attention-status/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['action'], 'end')

        # Ensure user progress is marked ended
        progress = UserModuleProgress.objects.get(firebase_uid='child1', module=self.module)
        self.assertTrue(progress.ended)
