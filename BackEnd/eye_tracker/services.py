"""
Eye-tracking service: frame processing and session state.

Preserves logic from Eye_Tracker.py. No execution on import; MediaPipe/Haar
are lazy-loaded on first use. Session state is stored in Django cache for
multi-request safety.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from django.conf import settings
from django.core.cache import cache

# ---------------------------------------------------------------------------
# Constants (from original script)
# ---------------------------------------------------------------------------
LEFT_EYE: List[int] = [33, 133]
RIGHT_EYE: List[int] = [362, 263]
LEFT_IRIS: List[int] = [468, 469, 470, 471]
RIGHT_IRIS: List[int] = [473, 474, 475, 476]
ALERT_TIME_SEC: float = 60.0
CACHE_KEY_PREFIX: str = "eye_tracker:session:"
CACHE_TIMEOUT_SEC: int = 86400  # 24h

# ---------------------------------------------------------------------------
# Lazy engine (no execution on import)
# ---------------------------------------------------------------------------
_face_mesh = None
_face_cascade = None
_use_mediapipe: Optional[bool] = None


def _get_engine() -> Tuple[bool, Any]:
    """Lazy-load MediaPipe or OpenCV Haar. Returns (use_mediapipe, face_mesh or face_cascade)."""
    global _face_mesh, _face_cascade, _use_mediapipe
    if _use_mediapipe is not None:
        return _use_mediapipe, _face_mesh if _use_mediapipe else _face_cascade

    try:
        import cv2
        import mediapipe as mp

        mp_face_mesh = mp.solutions.face_mesh
        _face_mesh = mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        _face_cascade = None
        _use_mediapipe = True
        return True, _face_mesh
    except Exception:
        pass

    try:
        import cv2

        _face_mesh = None
        _face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        _use_mediapipe = False
        return False, _face_cascade
    except Exception:
        _use_mediapipe = False
        _face_cascade = None
        return False, None


def _get_center(landmarks: Any, indices: List[int], w: float, h: float) -> np.ndarray:
    """Center of landmark indices in pixel coordinates."""
    pts = np.array([[landmarks[i].x * w, landmarks[i].y * h] for i in indices])
    return np.mean(pts, axis=0)


def _process_frame_mediapipe(
    rgb: np.ndarray, h: int, w: int, face_mesh: Any
) -> Tuple[str, Optional[float]]:
    """Run MediaPipe face mesh and compute status + gaze ratio. Returns (status, gaze_ratio)."""
    results = face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        return "NO_FACE", None

    landmarks = results.multi_face_landmarks[0].landmark

    # Left eye
    left_corner = np.array(
        [landmarks[LEFT_EYE[0]].x * w, landmarks[LEFT_EYE[0]].y * h]
    )
    right_corner = np.array(
        [landmarks[LEFT_EYE[1]].x * w, landmarks[LEFT_EYE[1]].y * h]
    )
    left_iris = _get_center(landmarks, LEFT_IRIS, w, h)
    left_ratio = (left_iris[0] - left_corner[0]) / (
        right_corner[0] - left_corner[0]
    )

    # Right eye
    left_corner_r = np.array(
        [landmarks[RIGHT_EYE[1]].x * w, landmarks[RIGHT_EYE[1]].y * h]
    )
    right_corner_r = np.array(
        [landmarks[RIGHT_EYE[0]].x * w, landmarks[RIGHT_EYE[0]].y * h]
    )
    right_iris = _get_center(landmarks, RIGHT_IRIS, w, h)
    right_ratio = (right_iris[0] - left_corner_r[0]) / (
        right_corner_r[0] - left_corner_r[0]
    )

    gaze_ratio = (left_ratio + right_ratio) / 2.0

    if 0.35 < gaze_ratio < 0.65:
        return "LOOKING", float(gaze_ratio)
    return "NOT_LOOKING", float(gaze_ratio)


def _process_frame_haar(
    gray: np.ndarray, face_cascade: Any
) -> Tuple[str, Optional[float]]:
    """Run Haar face detection. Returns (status, None)."""
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
    )
    if len(faces) > 0:
        return "LOOKING", None
    return "NOT_LOOKING", None


class EyeTrackerService:
    """
    Service for eye-tracking: session lifecycle and per-frame processing.

    Session state (not_looking_start, last_status) is stored in cache keyed by
    session_id so the API is safe in a multi-request environment.
    """

    @staticmethod
    def start_session(session_id: Optional[str] = None) -> str:
        """
        Initialize a tracking session. Creates cache entry for state.

        :param session_id: Optional existing id; if None, a new UUID is generated.
        :return: The session_id to use for process_frame and status.
        """
        sid = session_id or str(uuid.uuid4())
        key = f"{CACHE_KEY_PREFIX}{sid}"
        cache.set(
            key,
            {
                "not_looking_start": None,
                "last_status": None,
                "created_at": time.time(),
            },
            CACHE_TIMEOUT_SEC,
        )
        return sid

    @staticmethod
    def stop_session(session_id: str) -> bool:
        """
        Stop tracking and release session state from cache.

        :param session_id: Session to stop.
        :return: True if session existed and was deleted.
        """
        key = f"{CACHE_KEY_PREFIX}{session_id}"
        if cache.delete(key):
            return True
        return False

    @staticmethod
    def get_session_state(session_id: str) -> Optional[Dict[str, Any]]:
        """
        Return current session state (last_status, not_looking_start).

        :param session_id: Session id.
        :return: State dict or None if session not found.
        """
        key = f"{CACHE_KEY_PREFIX}{session_id}"
        return cache.get(key)

    @staticmethod
    def process_frame(
        image_bytes: bytes,
        session_id: Optional[str] = None,
        flip_horizontal: bool = True,
    ) -> Dict[str, Any]:
        """
        Process a single frame: decode image, run face/eye logic, update session.

        Preserves original behavior: BGR decode, optional flip, RGB for
        MediaPipe, gaze ratio or face presence, AWAY_ALERT after ALERT_TIME_SEC.

        :param image_bytes: Raw image bytes (e.g. JPEG/PNG from upload).
        :param session_id: Optional session id to read/update state.
        :param flip_horizontal: Whether to flip frame horizontally (default True).
        :return: Dict with status, gaze_ratio (if MediaPipe), session_id, and optional error.
        """
        import cv2

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            return {
                "status": "ERROR",
                "error": "invalid_image",
                "message": str(e),
                "session_id": session_id,
            }

        if frame is None or frame.size == 0:
            return {
                "status": "ERROR",
                "error": "decode_failed",
                "message": "Could not decode image",
                "session_id": session_id,
            }

        if flip_horizontal:
            frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        use_mp, engine = _get_engine()
        if engine is None:
            return {
                "status": "ERROR",
                "error": "engine_unavailable",
                "message": "No face detection engine available",
                "session_id": session_id,
            }

        if use_mp:
            status_text, gaze_ratio = _process_frame_mediapipe(rgb, h, w, engine)
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            status_text, gaze_ratio = _process_frame_haar(gray, engine)

        # Load session state for away-alert timing
        not_looking_start: Optional[float] = None
        if session_id:
            state = EyeTrackerService.get_session_state(session_id)
            if state is not None:
                not_looking_start = state.get("not_looking_start")

        if status_text == "NOT_LOOKING" or status_text == "NO_FACE":
            if not_looking_start is None:
                not_looking_start = time.time()
            elif time.time() - not_looking_start > ALERT_TIME_SEC:
                status_text = "AWAY_ALERT"
        else:
            not_looking_start = None

        # Persist session state
        if session_id:
            key = f"{CACHE_KEY_PREFIX}{session_id}"
            existing = cache.get(key) or {}
            cache.set(
                key,
                {
                    **existing,
                    "not_looking_start": not_looking_start,
                    "last_status": status_text,
                    "last_updated": time.time(),
                },
                CACHE_TIMEOUT_SEC,
            )

        result: Dict[str, Any] = {
            "status": status_text,
            "session_id": session_id,
        }
        if gaze_ratio is not None:
            result["gaze_ratio"] = round(gaze_ratio, 4)
        return result

    @staticmethod
    def get_status(session_id: str) -> Dict[str, Any]:
        """
        Return current tracker state for a session.

        :param session_id: Session id.
        :return: Dict with session_id, last_status, not_looking_start, exists.
        """
        state = EyeTrackerService.get_session_state(session_id)
        if state is None:
            return {
                "session_id": session_id,
                "exists": False,
                "last_status": None,
                "not_looking_start": None,
            }
        return {
            "session_id": session_id,
            "exists": True,
            "last_status": state.get("last_status"),
            "not_looking_start": state.get("not_looking_start"),
        }
