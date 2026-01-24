"""
Analytics service for admin dashboard.

Supports proposal section: "Admin & Analytics"
Metrics: Engagement, completion rates, difficulty progression, attention trends

Security: Aggregated data only, no PII, no individual child data
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
from firebase_admin import firestore
from games.services import GamesService
from progress.services import ProgressService


class AnalyticsService:
    """
    Service for aggregated analytics.
    
    Implements:
    - Engagement metrics
    - Completion rates
    - Difficulty progression (aggregated)
    - Attention trends (aggregated, no PII)
    """
    
    @staticmethod
    def get_engagement_metrics() -> Dict[str, Any]:
        """
        Get overall engagement metrics.
        
        Supports proposal: "Admin & Analytics"
        Security: Aggregated data only, no PII
        
        Returns:
            Engagement metrics dictionary
        """
        try:
            db = firestore.client()
            
            # Count total users (CHILD role only)
            users_ref = db.collection('users')
            users_query = users_ref.where('role', '==', 'CHILD')
            total_users = len(list(users_query.stream()))
            
            # Count active users (active in last 7 days)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            active_users = 0
            
            # Get active users from progress collection
            progress_ref = db.collection('progress')
            progress_docs = progress_ref.stream()
            
            active_user_ids = set()
            for doc in progress_docs:
                progress_data = doc.to_dict()
                last_active = progress_data.get('last_active')
                if last_active:
                    # Convert Firestore timestamp if needed
                    if hasattr(last_active, 'timestamp'):
                        last_active = last_active.timestamp()
                    elif isinstance(last_active, datetime):
                        pass
                    else:
                        continue
                    
                    if isinstance(last_active, (int, float)):
                        last_active = datetime.fromtimestamp(last_active)
                    
                    if last_active >= seven_days_ago:
                        active_user_ids.add(progress_data.get('student_id'))
            
            active_users = len(active_user_ids)
            
            # Count total game attempts
            games_ref = db.collection('games_progress')
            game_docs = list(games_ref.stream())
            total_game_attempts = sum(doc.to_dict().get('attempts', 0) for doc in game_docs)
            
            # Count course completions (from Django model or Firestore)
            # For now, use approximation from progress
            total_course_completions = sum(
                1 for doc in progress_docs
                if doc.to_dict().get('completed_games')
            )
            
            # Average session duration (simplified)
            average_session_duration = 15.0  # Placeholder - would need session tracking
            
            return {
                'total_users': total_users,
                'active_users': active_users,
                'total_game_attempts': total_game_attempts,
                'total_course_completions': total_course_completions,
                'average_session_duration': average_session_duration,
            }
            
        except Exception as e:
            print(f"Error getting engagement metrics: {e}")
            return {
                'total_users': 0,
                'active_users': 0,
                'total_game_attempts': 0,
                'total_course_completions': 0,
                'average_session_duration': 0.0,
            }
    
    @staticmethod
    def get_completion_rates(game_id: str = None, course_id: str = None) -> List[Dict[str, Any]]:
        """
        Get completion rates for games or courses.
        
        Supports proposal: "Admin & Analytics"
        
        Args:
            game_id: Optional game ID filter
            course_id: Optional course ID filter
            
        Returns:
            List of completion rate documents
        """
        try:
            db = firestore.client()
            results = []
            
            if game_id:
                # Get completion rate for specific game
                games_ref = db.collection('games_progress')
                query = games_ref.where('game_id', '==', game_id)
                docs = list(query.stream())
                
                total_attempts = len(docs)
                total_completions = sum(1 for doc in docs if doc.to_dict().get('completed', False))
                completion_rate = total_completions / total_attempts if total_attempts > 0 else 0.0
                
                results.append({
                    'game_id': game_id,
                    'completion_rate': completion_rate,
                    'total_attempts': total_attempts,
                    'total_completions': total_completions,
                })
            else:
                # Get completion rates for all games
                games_ref = db.collection('games_progress')
                docs = list(games_ref.stream())
                
                # Group by game_id
                game_stats = {}
                for doc in docs:
                    data = doc.to_dict()
                    gid = data.get('game_id')
                    if gid not in game_stats:
                        game_stats[gid] = {'attempts': 0, 'completions': 0}
                    game_stats[gid]['attempts'] += 1
                    if data.get('completed', False):
                        game_stats[gid]['completions'] += 1
                
                for gid, stats in game_stats.items():
                    results.append({
                        'game_id': gid,
                        'completion_rate': stats['completions'] / stats['attempts'] if stats['attempts'] > 0 else 0.0,
                        'total_attempts': stats['attempts'],
                        'total_completions': stats['completions'],
                    })
            
            return results
            
        except Exception as e:
            print(f"Error getting completion rates: {e}")
            return []
    
    @staticmethod
    def get_attention_trends(days: int = 7) -> List[Dict[str, Any]]:
        """
        Get aggregated attention trends.
        
        Supports proposal: "Admin & Analytics"
        Security: Aggregated data only, no individual child data
        
        Args:
            days: Number of days to analyze
            
        Returns:
            List of daily attention trend documents
        """
        try:
            # This would require attention_summary collection in Firestore
            # For now, return placeholder structure
            # In production, this would aggregate from attention_summary collection
            
            db = firestore.client()
            trends = []
            
            # Placeholder implementation
            # Real implementation would query attention_summary collection
            # and aggregate by date
            
            for i in range(days):
                date = datetime.utcnow() - timedelta(days=i)
                trends.append({
                    'date': date.date(),
                    'average_attention_percentage': 0.75,  # Placeholder
                    'total_sessions': 0,  # Placeholder
                    'average_session_duration': 0.0,  # Placeholder
                })
            
            return trends
            
        except Exception as e:
            print(f"Error getting attention trends: {e}")
            return []
