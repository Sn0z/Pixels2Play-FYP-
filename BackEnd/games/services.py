"""
Games service layer for AI learning games.

Supports proposal section: "Games & AI Learning Modules"
Educational principles: Constructivist learning, Incremental difficulty, Real-time feedback

Games implemented:
1. Pattern Puzzler - Pattern recognition & classification
2. Decision Maze - AI decision-making, cause-and-effect
3. Prediction Station - Supervised learning & prediction
4. Sorting Adventure - Training data & classification
5. AI Story Builder - Creative AI & ethical decision-making
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from utils.firestore import FirestoreService
from utils.constants import ROLE_CHILD, ROLE_UNASSIGNED


# Game definitions - maps to proposal requirements
GAMES = {
    'pattern_puzzler': {
        'name': 'Pattern Puzzler',
        'description': 'Learn pattern recognition and classification through interactive puzzles',
        'ai_concept': 'Pattern Recognition & Classification',
        'difficulty_levels': [1, 2, 3, 4, 5],
    },
    'decision_maze': {
        'name': 'Decision Maze',
        'description': 'Navigate through mazes using AI decision-making principles',
        'ai_concept': 'AI Decision-Making & Cause-and-Effect',
        'difficulty_levels': [1, 2, 3, 4],
    },
    'prediction_station': {
        'name': 'Prediction Station',
        'description': 'Make predictions and learn about supervised learning',
        'ai_concept': 'Supervised Learning & Prediction',
        'difficulty_levels': [1, 2, 3, 4, 5],
    },
    'sorting_adventure': {
        'name': 'Sorting Adventure',
        'description': 'Sort and classify items to understand training data concepts',
        'ai_concept': 'Training Data & Classification',
        'difficulty_levels': [1, 2, 3],
    },
    'whack_a_mole_math': {
        'name': 'Whack-a-Mole Math',
        'description': 'Solve math equations by whacking the correct mole!',
        'ai_concept': 'Basic Mathematics & Speed Processing',
        'difficulty_levels': [1, 2, 3],
    },
    'dino_camera_game': {
        'name': 'Dino Camera Runner',
        'description': 'Jump and crouch using your body to control the T-Rex over obstacles!',
        'ai_concept': 'Computer Vision (Pose Detection)',
        'difficulty_level': 'Medium'
    },
    'ai_story_builder': {
        'name': 'AI Story Builder',
        'description': 'Create stories while learning about creative AI and ethics',
        'ai_concept': 'Creative AI & Ethical Decision-Making',
        'difficulty_levels': [1, 2, 3],
    },
    'rock_paper_scissors': {
        'name': 'Rock, Paper, Scissors',
        'description': 'Challenge the AI — it learns your patterns!',
        'ai_concept': 'Pattern Prediction & AI Strategy',
        'difficulty_levels': [1],
    },
}


class GamesService:
    """
    Service for game operations.
    
    Implements:
    - Adaptive difficulty (Zone of Proximal Development)
    - Progress tracking
    - Score management
    - Completion tracking
    """
    
    @staticmethod
    def get_available_games() -> List[Dict[str, Any]]:
        """
        Get list of all available games.
        
        Returns:
            List of game definitions
        """
        return [
            {
                'game_id': game_id,
                **game_info
            }
            for game_id, game_info in GAMES.items()
        ]
    
    @staticmethod
    def get_game_progress(student_id: str, game_id: str) -> Optional[Dict[str, Any]]:
        """
        Get student's progress for a specific game.
        
        Supports: Incremental difficulty tracking
        
        Args:
            student_id: Firebase UID of student
            game_id: Game identifier
            
        Returns:
            Game progress document or None
        """
        try:
            # Query Firestore games_progress collection
            from firebase_admin import firestore
            db = firestore.client()
            progress_ref = db.collection('games_progress')
            query = progress_ref.where('student_id', '==', student_id).where('game_id', '==', game_id)
            docs = query.stream()
            
            for doc in docs:
                progress = doc.to_dict()
                progress['id'] = doc.id
                return progress
            
            return None
        except Exception as e:
            print(f"Error getting game progress: {e}")
            return None
    
    @staticmethod
    def save_game_attempt(
        student_id: str,
        game_id: str,
        score: float,
        difficulty_level: int,
        completed: bool = False,
        game_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Save a game attempt and update progress.
        
        Supports: Real-time feedback, adaptive difficulty
        
        Args:
            student_id: Firebase UID of student
            game_id: Game identifier
            score: Score achieved (0.0 - 1.0)
            difficulty_level: Difficulty level attempted
            completed: Whether game was completed
            game_data: Optional game-specific data
            
        Returns:
            Updated progress document
        """
        try:
            from firebase_admin import firestore
            db = firestore.client()
            
            # Get or create progress document
            progress_id = f"{student_id}_{game_id}"
            progress_ref = db.collection('games_progress').document(progress_id)
            progress_doc = progress_ref.get()
            
            if progress_doc.exists:
                progress = progress_doc.to_dict()
                attempts = progress.get('attempts', 0) + 1
                best_score = max(progress.get('best_score', 0.0), score)
                
                # Adaptive difficulty: increase if score > 0.8, decrease if score < 0.5
                current_difficulty = progress.get('difficulty_level', difficulty_level)
                difficulty_levels = GAMES.get(game_id, {}).get('difficulty_levels', [1])
                max_difficulty = max(difficulty_levels) if difficulty_levels else 1
                if score >= 0.8 and current_difficulty < max_difficulty:
                    current_difficulty += 1
                elif score < 0.5 and current_difficulty > 1:
                    current_difficulty -= 1
            else:
                attempts = 1
                best_score = score
                current_difficulty = difficulty_level
            
            # Update progress
            update_data = {
                'student_id': student_id,
                'game_id': game_id,
                'score': score,
                'difficulty_level': current_difficulty,
                'attempts': attempts,
                'best_score': best_score,
                'completed': completed or progress_doc.exists and progress_doc.to_dict().get('completed', False),
                'last_attempt_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            if game_data:
                update_data['game_data'] = game_data
                
                # Log play activity if duration provided
                duration_seconds = game_data.get('duration_seconds')
                if duration_seconds:
                    try:
                        from progress.activity import ActivityService
                        ActivityService.log_activity(student_id, 'play', int(duration_seconds))
                    except Exception as activity_err:
                        print(f"Error logging play activity: {activity_err}")
            
            if not progress_doc.exists:
                update_data['created_at'] = datetime.utcnow()
            
            progress_ref.set(update_data, merge=True)
            update_data['id'] = progress_id
            
            return update_data
            
        except Exception as e:
            print(f"Error saving game attempt: {e}")
            raise
    
    @staticmethod
    def get_all_progress(student_id: str) -> List[Dict[str, Any]]:
        """
        Get all game progress for a student.
        
        Args:
            student_id: Firebase UID of student
            
        Returns:
            List of progress documents
        """
        try:
            from firebase_admin import firestore
            db = firestore.client()
            progress_ref = db.collection('games_progress')
            query = progress_ref.where('student_id', '==', student_id)
            docs = query.stream()
            
            progress_list = []
            for doc in docs:
                progress = doc.to_dict()
                progress['id'] = doc.id
                progress_list.append(progress)
            
            return progress_list
        except Exception as e:
            print(f"Error getting all progress: {e}")
            return []
    
    @staticmethod
    def get_game_stats(student_id: str, game_id: str) -> Dict[str, Any]:
        """
        Get statistics for a specific game.
        
        Supports: Progress tracking for parent/child dashboards
        
        Args:
            student_id: Firebase UID of student
            game_id: Game identifier
            
        Returns:
            Statistics dictionary
        """
        progress = GamesService.get_game_progress(student_id, game_id)
        
        if not progress:
            return {
                'game_id': game_id,
                'total_attempts': 0,
                'best_score': 0.0,
                'average_score': 0.0,
                'completion_rate': 0.0,
                'current_difficulty': 1,
            }
        
        return {
            'game_id': game_id,
            'total_attempts': progress.get('attempts', 0),
            'best_score': progress.get('best_score', 0.0),
            'average_score': progress.get('score', 0.0),  # Last score as approximation
            'completion_rate': 1.0 if progress.get('completed', False) else 0.0,
            'current_difficulty': progress.get('difficulty_level', 1),
        }
