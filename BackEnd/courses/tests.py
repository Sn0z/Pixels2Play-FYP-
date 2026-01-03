from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch
from .models import Module, QuizQuestion, QuizChoice, UserModuleProgress, ParentChildLink
import json

class CoursesAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.module = Module.objects.create(
            title='Test Module',
            video_url='dQw4w9WgXcQ',
            video_duration=100.0,
            required_percent=0.9,
            quiz_passing_score=0.7,
            published=True,
        )
        q = QuizQuestion.objects.create(module=self.module, text='What is 2+2?')
        QuizChoice.objects.create(question=q, text='3', is_correct=False)
        QuizChoice.objects.create(question=q, text='4', is_correct=True)

    @patch('courses.views.verify_firebase_token')
    def test_update_watch_plausibility(self, mock_verify):
        mock_verify.return_value = {'uid': 'child1'}

        # first legal update
        res = self.client.post(f'/api/courses/modules/{self.module.id}/watch/', json.dumps({'current_time': 5}), content_type='application/json')
        self.assertEqual(res.status_code, 200)

        # simulate unrealistic jump: directly to 90s which is too fast
        res = self.client.post(f'/api/courses/modules/{self.module.id}/watch/', json.dumps({'current_time': 90}), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    @patch('courses.views.verify_firebase_token')
    def test_submit_quiz_and_completion(self, mock_verify):
        mock_verify.return_value = {'uid': 'child2'}
        # create progress that marks watched enough
        progress = UserModuleProgress.objects.create(firebase_uid='child2', module=self.module, max_watched_seconds=95.0)

        # fetch quiz
        res = self.client.get(f'/api/courses/modules/{self.module.id}/quiz/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        question_id = data[0]['id']
        choice_id = data[0]['choices'][1]['id']  # the correct one we created second

        payload = {'answers': [{'question_id': question_id, 'choice_id': choice_id}]}
        res = self.client.post(f'/api/courses/modules/{self.module.id}/quiz/submit/', json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        out = res.json()
        self.assertAlmostEqual(out['score'], 1.0)
        self.assertTrue(out['completed'])

    @patch('courses.views.verify_firebase_token')
    def test_parent_link_block(self, mock_verify):
        mock_verify.return_value = {'uid': 'child3'}
        ParentChildLink.objects.create(parent_uid='parent1', child_uid='child3', approved=False)

        res = self.client.post(f'/api/courses/modules/{self.module.id}/watch/', json.dumps({'current_time': 5}), content_type='application/json')
        self.assertEqual(res.status_code, 403)

    from django.test import override_settings

    @override_settings(COURSE_ADMIN_UIDS=['admin1'])
    @patch('courses.views.verify_firebase_token')
    def test_import_module(self, mock_verify):
        mock_verify.return_value = {'uid': 'admin1'}
        module_payload = {
            'module': {
                'title': 'FS Module',
                'description': 'From firestone',
                'order': 10,
                'video_url': 'dQw4w9WgXcQ',
                'video_host': 'youtube',
                'video_duration': 120,
                'required_percent': 0.9,
                'quiz_passing_score': 0.7,
                'published': True,
                'questions': [
                    {'text': '1+1?', 'choices': [{'text': '2', 'is_correct': True}, {'text': '3', 'is_correct': False}]}
                ]
            }
        }

        res = self.client.post('/api/courses/import/', json.dumps(module_payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue('module_id' in data)
