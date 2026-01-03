import argparse
import time
import requests
import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

LEFT_EYE = [33, 133]
RIGHT_EYE = [362, 263]

LEFT_IRIS = [468, 469, 470, 471]
RIGHT_IRIS = [473, 474, 475, 476]

ALERT_TIME = 60  # seconds before declaring away

cap = cv2.VideoCapture(0)
not_looking_start = None
last_state = None
last_sent_state = None


def get_center(landmarks, indices, w, h):
    pts = np.array([[landmarks[i].x * w, landmarks[i].y * h] for i in indices])
    return np.mean(pts, axis=0)


def send_status(server, module_id, state, eye_key=None, firebase_token=None, uid=None):
    url = f"{server.rstrip('/')}/api/courses/modules/{module_id}/attention/"
    headers = {'Content-Type': 'application/json'}
    if firebase_token:
        headers['Authorization'] = f'Bearer {firebase_token}'
    if eye_key:
        headers['X-EYE-KEY'] = eye_key

    payload = {'status': state}
    if eye_key and uid:
        payload['uid'] = uid

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=5)
        try:
            j = r.json()
        except Exception:
            j = {'status_code': r.status_code, 'text': r.text}
        print(f"Sent {state} -> {r.status_code} {j}")
        return j
    except Exception as e:
        print('Send failed', e)
        return None


def main():
    parser = argparse.ArgumentParser(description='Eye tracker client that posts attention events to the backend')
    parser.add_argument('--module-id', required=True, help='Module ID to report attention for')
    parser.add_argument('--server', default='http://127.0.0.1:8000', help='Backend server base URL')
    parser.add_argument('--eye-key', help='EYE_TRACKER_SECRET to use X-EYE-KEY auth')
    parser.add_argument('--uid', help='Firebase uid (required when using --eye-key)')
    parser.add_argument('--firebase-token', help='Firebase ID token to use Bearer auth')
    args = parser.parse_args()

    global not_looking_start, last_state, last_sent_state

    if args.eye_key and not args.uid:
        print('When using --eye-key you must pass --uid of the user to associate events with')
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)
        h, w, _ = frame.shape
        status_text = 'NO_FACE'

        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark

            # Left eye
            left_corner = np.array([landmarks[LEFT_EYE[0]].x * w, landmarks[LEFT_EYE[0]].y * h])
            right_corner = np.array([landmarks[LEFT_EYE[1]].x * w, landmarks[LEFT_EYE[1]].y * h])
            left_iris = get_center(landmarks, LEFT_IRIS, w, h)
            left_ratio = (left_iris[0] - left_corner[0]) / (right_corner[0] - left_corner[0])

            # Right eye
            left_corner_r = np.array([landmarks[RIGHT_EYE[1]].x * w, landmarks[RIGHT_EYE[1]].y * h])
            right_corner_r = np.array([landmarks[RIGHT_EYE[0]].x * w, landmarks[RIGHT_EYE[0]].y * h])
            right_iris = get_center(landmarks, RIGHT_IRIS, w, h)
            right_ratio = (right_iris[0] - left_corner_r[0]) / (right_corner_r[0] - left_corner_r[0])

            gaze_ratio = (left_ratio + right_ratio) / 2

            if 0.35 < gaze_ratio < 0.65:
                status_text = 'LOOKING'
                not_looking_start = None
            else:
                status_text = 'NOT_LOOKING'
                if not_looking_start is None:
                    not_looking_start = time.time()
                elif time.time() - not_looking_start > ALERT_TIME:
                    status_text = 'AWAY_ALERT'

            cv2.circle(frame, tuple(left_iris.astype(int)), 3, (0, 255, 0), -1)
            cv2.circle(frame, tuple(right_iris.astype(int)), 3, (0, 255, 0), -1)

        # Only send when state changes
        if status_text != last_sent_state:
            last_sent_state = status_text
            # Normalize to values backend expects
            normalized = status_text
            if status_text == 'NO_FACE':
                normalized = 'NOT_LOOKING'
            if status_text == 'AWAY_ALERT':
                normalized = 'AWAY_ALERT'

            send_status(args.server, args.module_id, normalized, eye_key=args.eye_key, firebase_token=args.firebase_token, uid=args.uid)

        if status_text != last_state:
            print(status_text)
            last_state = status_text

        cv2.putText(frame, status_text, (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        cv2.imshow('Eye Attention Tracker', frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
