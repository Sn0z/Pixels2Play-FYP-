"""
Eye tracker REST API views.

Thin layer: validate input and delegate to EyeTrackerService.
"""

from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from eye_tracker.serializers import (
    StartSessionRequestSerializer,
    StopSessionRequestSerializer,
    StatusResponseSerializer,
)
from eye_tracker.services import EyeTrackerService


class StartSessionView(APIView):
    """
    POST /api/eye-tracker/start/

    Initialize a tracking session. Returns session_id for use in process-frame and status.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request: Request) -> Response:
        serializer = StartSessionRequestSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(
                {"error": "validation_error", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session_id = serializer.validated_data.get("session_id") or None
        if session_id == "":
            session_id = None
        sid = EyeTrackerService.start_session(session_id=session_id)
        return Response(
            {"session_id": sid, "status": "started"},
            status=status.HTTP_201_CREATED,
        )


class StopSessionView(APIView):
    """
    POST /api/eye-tracker/stop/

    Stop tracking and release session state.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request: Request) -> Response:
        serializer = StopSessionRequestSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(
                {"error": "validation_error", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session_id = serializer.validated_data["session_id"]
        stopped = EyeTrackerService.stop_session(session_id)
        return Response(
            {"status": "stopped", "session_id": session_id},
            status=status.HTTP_200_OK,
        )


class ProcessFrameView(APIView):
    """
    POST /api/eye-tracker/process-frame/

    Process a single frame. Accepts:
    - multipart/form-data: field 'frame' (image file), optional 'session_id', optional 'flip' (true/false).
    - JSON: optional 'session_id', optional 'flip'; image as base64 in 'image' (data URL or raw base64).
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        session_id = None
        image_bytes = None
        flip = True

        if request.content_type and "multipart/form-data" in request.content_type:
            frame_file = request.FILES.get("frame")
            if not frame_file:
                return Response(
                    {"error": "missing_frame", "message": "Missing 'frame' file"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                image_bytes = frame_file.read()
            except Exception as e:
                return Response(
                    {"error": "read_failed", "message": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            session_id = request.data.get("session_id") or request.POST.get("session_id")
            flip_val = request.data.get("flip") or request.POST.get("flip")
            if flip_val is not None:
                flip = str(flip_val).lower() in ("true", "1", "yes")
        else:
            data = request.data or {}
            session_id = data.get("session_id")
            flip = data.get("flip", True)
            if isinstance(flip, str):
                flip = flip.lower() in ("true", "1", "yes")
            raw = data.get("image")
            if not raw:
                return Response(
                    {"error": "missing_image", "message": "Missing 'image' (base64 or data URL)"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if isinstance(raw, str):
                if raw.startswith("data:"):
                    raw = raw.split(",", 1)[-1]
                import base64

                try:
                    image_bytes = base64.b64decode(raw)
                except Exception as e:
                    return Response(
                        {"error": "invalid_base64", "message": str(e)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                return Response(
                    {"error": "invalid_image", "message": "image must be base64 string"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not image_bytes:
            return Response(
                {"error": "missing_frame", "message": "No image data"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = EyeTrackerService.process_frame(
                image_bytes,
                session_id=session_id,
                flip_horizontal=flip,
            )
        except Exception as e:
            return Response(
                {
                    "status": "ERROR",
                    "error": "process_failed",
                    "message": str(e),
                    "session_id": session_id,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if result.get("status") == "ERROR":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class StatusView(APIView):
    """
    GET /api/eye-tracker/status/?session_id=<id>

    Return current tracker state for the given session.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"error": "missing_session_id", "message": "Query param session_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = EyeTrackerService.get_status(session_id)
        serializer = StatusResponseSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
