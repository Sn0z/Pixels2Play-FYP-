from django.apps import AppConfig


class UtilsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'utils'
    
    def ready(self):
        """
        Initialize Firebase when Django starts.
        This ensures Firebase is ready before any views or middleware use it.
        """
        from .firebase_init import initialize_firebase
        try:
            initialize_firebase()
        except Exception as e:
            # Log error but don't crash Django startup
            # Firebase will be initialized lazily when needed
            print(f"Warning: Firebase initialization in AppConfig failed: {e}")
