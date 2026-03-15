"""
Activity tracking service for logging daily play vs study time.
"""
from typing import Dict, Any, List
from datetime import datetime
from firebase_admin import firestore
from utils.firestore import get_db

class ActivityService:
    """
    Service for tracking daily activity (study vs play) per child.
    """

    @staticmethod
    def log_activity(student_id: str, activity_type: str, duration_seconds: int) -> bool:
        """
        Log duration for a specific activity type ('play' or 'study').
        Updates or creates a daily activity document for the student.
        
        Args:
            student_id: Firebase UID of student
            activity_type: 'play' or 'study'
            duration_seconds: Duration completed in seconds
        """
        if duration_seconds <= 0:
            return True
            
        if activity_type not in ('play', 'study'):
            print(f"[ERROR] Invalid activity type: {activity_type}")
            return False

        try:
            db = get_db()
            today_str = datetime.utcnow().strftime('%Y-%m-%d')
            doc_id = f"{student_id}_{today_str}"
            
            activity_ref = db.collection('daily_activity').document(doc_id)
            
            # Using Firestore's increment to accurately accrue time 
            # even if concurrent updates happen.
            increment = firestore.Increment(duration_seconds)
            
            update_data: Dict[str, Any] = {
                'student_id': student_id,
                'date': today_str,
                'updated_at': firestore.SERVER_TIMESTAMP,
            }
            
            if activity_type == 'play':
                update_data['play_seconds'] = increment
            else:
                update_data['study_seconds'] = increment
                
            activity_ref.set(update_data, merge=True)
            return True
            
        except Exception as e:
            print(f"[ERROR] log_activity: {e}")
            return False

    @staticmethod
    def get_recent_activity(student_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """
        Gets the recent activity metrics for the dashboard.

        Uses doc-ID range query to avoid needing a composite Firestore index.
        Doc IDs are formatted as: {student_id}_{YYYY-MM-DD}

        Args:
            student_id: Firebase UID of student
            days: Number of recent days to fetch
        """
        try:
            db = get_db()

            from datetime import datetime, timedelta
            today = datetime.utcnow()
            dates = [
                (today - timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(days)
            ]

            activity_list = []
            for date_str in sorted(dates):  # ascending
                doc_id = f"{student_id}_{date_str}"
                doc = db.collection('daily_activity').document(doc_id).get()
                if doc.exists:
                    data = doc.to_dict()
                    activity_list.append({
                        'date': data.get('date', date_str),
                        'play_seconds': data.get('play_seconds', 0),
                        'study_seconds': data.get('study_seconds', 0),
                    })
                else:
                    # Always include the date even if no activity
                    activity_list.append({
                        'date': date_str,
                        'play_seconds': 0,
                        'study_seconds': 0,
                    })

            return activity_list

        except Exception as e:
            print(f"[ERROR] get_recent_activity: {e}")
            return []
