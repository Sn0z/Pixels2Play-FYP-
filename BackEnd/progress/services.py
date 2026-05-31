"""
Progress tracking service.

Supports proposal section: "Progress Tracking & Feedback"
Tracks: Completed games, concept mastery, improvement over time, badges/achievements

Educational principles: Cognitive load reduction, progress visualization
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from firebase_admin import firestore
from games.services import GamesService, GAMES


# Badge definitions - gamification support
BADGES = {
    'first_game': {
        'name': 'First Steps',
        'description': 'Completed your first game',
        'concept': None,
    },
    'pattern_master': {
        'name': 'Pattern Master',
        'description': 'Mastered pattern recognition',
        'concept': 'Pattern Recognition & Classification',
    },
    'decision_expert': {
        'name': 'Decision Expert',
        'description': 'Mastered decision-making concepts',
        'concept': 'AI Decision-Making & Cause-and-Effect',
    },
    'prediction_pro': {
        'name': 'Prediction Pro',
        'description': 'Mastered prediction concepts',
        'concept': 'Supervised Learning & Prediction',
    },
    'perfect_score': {
        'name': 'Perfect Score',
        'description': 'Achieved a perfect score in any game',
        'concept': None,
    },
    'persistent_learner': {
        'name': 'Persistent Learner',
        'description': 'Completed 10 games',
        'concept': None,
    },
}


class ProgressService:
    """
    Service for tracking child learning progress.
    
    Implements:
    - Completed games tracking
    - Concept mastery calculation
    - Badge/achievement system
    - Improvement over time metrics
    """
    
    @staticmethod
    def get_progress_summary(student_id: str) -> Dict[str, Any]:
        """
        Get overall progress summary for a student.
        
        Supports proposal: "Progress Tracking & Feedback"
        
        Args:
            student_id: Firebase UID of student
            
        Returns:
            Progress summary dictionary
        """
        try:
            db = firestore.client()
            
            # Get all game progress
            game_progress_list = GamesService.get_all_progress(student_id)
            
            # Calculate metrics
            completed_games = [
                gp['game_id'] for gp in game_progress_list
                if gp.get('completed', False)
            ]
            
            total_attempts = sum(gp.get('attempts', 0) for gp in game_progress_list)
            
            # Calculate mastery level (average of best scores)
            if game_progress_list:
                best_scores = [gp.get('best_score', 0.0) for gp in game_progress_list]
                mastery_level = sum(best_scores) / len(best_scores) if best_scores else 0.0
            else:
                mastery_level = 0.0
            
            # Get badges
            badges = ProgressService._calculate_badges(student_id, game_progress_list)
            
            # Calculate improvement rate (simplified: based on recent vs older attempts)
            improvement_rate = ProgressService._calculate_improvement_rate(game_progress_list)
            
            # Get or create progress document
            progress_id = f"progress_{student_id}"
            progress_ref = db.collection('progress').document(progress_id)
            
            update_data = {
                'student_id': student_id,
                'completed_games': completed_games,
                'mastery_level': mastery_level,
                'badges': badges,
                'total_attempts': total_attempts,
                'improvement_rate': improvement_rate,
                'last_active': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            progress_doc = progress_ref.get()
            if not progress_doc.exists:
                update_data['created_at'] = datetime.utcnow()
            
            progress_ref.set(update_data, merge=True)
            update_data['id'] = progress_id
            
            return update_data
            
        except Exception as e:
            print(f"Error getting progress summary: {e}")
            return {
                'student_id': student_id,
                'completed_games': [],
                'mastery_level': 0.0,
                'badges': [],
                'total_attempts': 0,
                'improvement_rate': 0.0,
                'last_active': datetime.utcnow(),
            }
    
    @staticmethod
    def _calculate_badges(student_id: str, game_progress_list: List[Dict]) -> List[str]:
        """
        Calculate badges earned by student.
        
        Supports proposal: Gamification
        
        Args:
            student_id: Firebase UID
            game_progress_list: List of game progress documents
            
        Returns:
            List of badge IDs
        """
        badges_earned = []
        
        # First game badge
        if len(game_progress_list) > 0:
            badges_earned.append('first_game')
        
        # Perfect score badge
        if any(gp.get('best_score', 0.0) >= 1.0 for gp in game_progress_list):
            badges_earned.append('perfect_score')
        
        # Persistent learner (10 completed games)
        completed_count = sum(1 for gp in game_progress_list if gp.get('completed', False))
        if completed_count >= 10:
            badges_earned.append('persistent_learner')
        
        # Concept-specific badges
        concept_mastery = ProgressService._calculate_concept_mastery(game_progress_list)
        for concept, mastery in concept_mastery.items():
            if mastery >= 0.8:  # 80% mastery threshold
                if concept == 'Pattern Recognition & Classification':
                    badges_earned.append('pattern_master')
                elif concept == 'AI Decision-Making & Cause-and-Effect':
                    badges_earned.append('decision_expert')
                elif concept == 'Supervised Learning & Prediction':
                    badges_earned.append('prediction_pro')
        
        return list(set(badges_earned))  # Remove duplicates
    
    @staticmethod
    def _calculate_concept_mastery(game_progress_list: List[Dict]) -> Dict[str, float]:
        """
        Calculate mastery level for each AI concept.
        
        Args:
            game_progress_list: List of game progress documents
            
        Returns:
            Dictionary mapping concept to mastery level (0.0 - 1.0)
        """
        concept_scores = {}
        
        for gp in game_progress_list:
            game_id = gp.get('game_id')
            game_info = GAMES.get(game_id, {})
            concept = game_info.get('ai_concept', '')
            
            if concept:
                if concept not in concept_scores:
                    concept_scores[concept] = []
                concept_scores[concept].append(gp.get('best_score', 0.0))
        
        # Calculate average for each concept
        concept_mastery = {}
        for concept, scores in concept_scores.items():
            concept_mastery[concept] = sum(scores) / len(scores) if scores else 0.0
        
        return concept_mastery
    
    @staticmethod
    def _calculate_improvement_rate(game_progress_list: List[Dict]) -> float:
        """
        Calculate improvement rate over time.
        
        Simplified: compares recent scores to older scores.
        
        Args:
            game_progress_list: List of game progress documents
            
        Returns:
            Improvement rate (positive = improving, negative = declining)
        """
        if len(game_progress_list) < 2:
            return 0.0
        
        # Sort by last attempt (if available)
        # For simplicity, use best_score as proxy for improvement
        scores = [gp.get('best_score', 0.0) for gp in game_progress_list]
        
        if len(scores) >= 2:
            # Compare first half to second half
            mid = len(scores) // 2
            early_avg = sum(scores[:mid]) / mid
            late_avg = sum(scores[mid:]) / (len(scores) - mid)
            return late_avg - early_avg
        
        return 0.0
    
    @staticmethod
    def get_concept_mastery(student_id: str) -> List[Dict[str, Any]]:
        """
        Get mastery levels for each AI concept.
        
        Supports proposal: "Progress Tracking & Feedback"
        
        Args:
            student_id: Firebase UID of student
            
        Returns:
            List of concept mastery documents
        """
        game_progress_list = GamesService.get_all_progress(student_id)
        concept_mastery = ProgressService._calculate_concept_mastery(game_progress_list)
        
        result = []
        for concept, mastery in concept_mastery.items():
            # Count games completed for this concept
            games_for_concept = [
                gp for gp in game_progress_list
                if GAMES.get(gp.get('game_id', ''), {}).get('ai_concept') == concept
            ]
            games_completed = sum(1 for gp in games_for_concept if gp.get('completed', False))
            
            result.append({
                'concept': concept,
                'mastery_level': mastery,
                'games_completed': games_completed,
                'last_updated': datetime.utcnow(),
            })
        
        return result
