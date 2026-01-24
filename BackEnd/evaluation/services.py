"""
Evaluation service for research support.

Supports proposal section: "Evaluation & Testing Support"
Tracks: Pre-test scores, post-test scores, improvement, engagement duration
"""

from typing import Dict, Any, Optional
from datetime import datetime
from firebase_admin import firestore


class EvaluationService:
    """
    Service for evaluation data.
    
    Supports research evaluation by tracking:
    - Pre-test and post-test scores
    - Improvement metrics
    - Engagement duration
    """
    
    @staticmethod
    def save_evaluation_data(
        student_id: str,
        pre_test_score: float,
        post_test_score: float,
        engagement_duration: float
    ) -> Dict[str, Any]:
        """
        Save evaluation data for a student.
        
        Supports proposal: "Evaluation & Testing Support"
        
        Args:
            student_id: Firebase UID of student
            pre_test_score: Pre-test score (0.0 - 1.0)
            post_test_score: Post-test score (0.0 - 1.0)
            engagement_duration: Total engagement time in minutes
            
        Returns:
            Evaluation document
        """
        try:
            db = firestore.client()
            
            improvement = post_test_score - pre_test_score
            
            evaluation_data = {
                'student_id': student_id,
                'pre_test_score': pre_test_score,
                'post_test_score': post_test_score,
                'improvement': improvement,
                'engagement_duration': engagement_duration,
                'timestamp': datetime.utcnow(),
            }
            
            # Create evaluation document
            evaluation_id = f"eval_{student_id}_{int(datetime.utcnow().timestamp())}"
            db.collection('evaluation').document(evaluation_id).set(evaluation_data)
            evaluation_data['id'] = evaluation_id
            
            return evaluation_data
            
        except Exception as e:
            print(f"Error saving evaluation data: {e}")
            raise
    
    @staticmethod
    def get_evaluation_data(student_id: str) -> Optional[Dict[str, Any]]:
        """
        Get evaluation data for a student.
        
        Args:
            student_id: Firebase UID of student
            
        Returns:
            Latest evaluation document or None
        """
        try:
            db = firestore.client()
            evaluation_ref = db.collection('evaluation')
            query = evaluation_ref.where('student_id', '==', student_id).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1)
            docs = list(query.stream())
            
            if docs:
                data = docs[0].to_dict()
                data['id'] = docs[0].id
                return data
            
            return None
            
        except Exception as e:
            print(f"Error getting evaluation data: {e}")
            return None
