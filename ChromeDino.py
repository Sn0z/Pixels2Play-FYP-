import pygame
import sys
import random
import math
import time
import cv2
import mediapipe as mp

# === Initialize Pygame ===
pygame.init()
screen = pygame.display.set_mode((1280, 720))
clock = pygame.time.Clock()
pygame.display.set_caption("Dino Game")

game_font = pygame.font.Font("assets/PressStart2P-Regular.ttf", 24)

# === MediaPipe Pose Setup ===
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    min_detection_confidence=0.7,  # Increased for faster detection
    min_tracking_confidence=0.7,   # Increased for faster tracking
    model_complexity=0              # Use lite model for speed
)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)    # Lower resolution for speed
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cap.set(cv2.CAP_PROP_FPS, 30)             # Cap at 30 FPS

# Check if camera is available
if not cap.isOpened():
    print("ERROR: Could not open camera. Please check your camera connection.")
    sys.exit(1)

# Calibration variables
calibrated = False
neutral_shoulder_y = None
jump_threshold = None
crouch_threshold = None
frame_skip_counter = 0  # Frame skipping for performance
FRAME_SKIP = 2          # Process every 3rd frame (30fps -> 10fps processing)
calibration_start_time = None  # For timeout
CALIBRATION_TIMEOUT = 10  # seconds before auto-calibration skips

# === Constants ===
GROUND_Y = 350
GRAVITY = 1.1
JUMP_STRENGTH = 22
DUCK_HEIGHT = 60
RUN_WIDTH, RUN_HEIGHT = 80, 100
DUCK_WIDTH, DUCK_HEIGHT = 110, 60

# Speed model (pixels/sec)
BASE_SPEED = 300.0      
ACCEL = 22.0            
SMOOTH_RATE = 3.0       

# === Classes for Dino Game ===
class Cloud(pygame.sprite.Sprite):
    def __init__(self, image, x_pos, y_pos):
        super().__init__()
        self.image = image
        self.x_pos = x_pos
        self.y_pos = y_pos
        self.rect = self.image.get_rect(center=(self.x_pos, self.y_pos))

    def update(self, dt, game_speed):
        # move slower than ground for parallax
        self.rect.x -= max(60.0, 0.25 * game_speed) * dt

class Dino(pygame.sprite.Sprite):
    def __init__(self, x_pos, ground_y):
        super().__init__()
        # Load sprites
        self.running_sprites = [
            pygame.transform.scale(pygame.image.load("assets/Dino1.png"), (RUN_WIDTH, RUN_HEIGHT)),
            pygame.transform.scale(pygame.image.load("assets/Dino2.png"), (RUN_WIDTH, RUN_HEIGHT)),
        ]
        self.ducking_sprites = [
            pygame.transform.scale(pygame.image.load("assets/DinoDucking1.png"), (DUCK_WIDTH, DUCK_HEIGHT)),
            pygame.transform.scale(pygame.image.load("assets/DinoDucking2.png"), (DUCK_WIDTH, DUCK_HEIGHT)),
        ]
        self.current_image = 0
        self.ducking = False

        self.image = self.running_sprites[self.current_image]
        self.rect = self.image.get_rect(midbottom=(x_pos, ground_y))

        # Physics
        self.vel_y = 0
        self.ground_y = ground_y
        self.on_ground = True

        # Animation timer
        self.anim_speed = 0.1

    def get_hitbox(self):
        # Shrink hitbox to avoid transparent borders causing early collisions
        return self.rect.inflate(-30, -20)

    def jump(self):
        if self.on_ground:
            self.vel_y = -JUMP_STRENGTH
            self.on_ground = False
            jump_sfx.play()

    def duck(self):
        if not self.ducking:
            self.ducking = True
            feet = self.rect.midbottom
            self.image = self.ducking_sprites[int(self.current_image)]
            self.rect = self.image.get_rect(midbottom=feet)

    def unduck(self):
        if self.ducking:
            self.ducking = False
            feet = self.rect.midbottom
            self.image = self.running_sprites[int(self.current_image)]
            self.rect = self.image.get_rect(midbottom=feet)

    def apply_gravity(self):
        self.vel_y += GRAVITY
        self.rect.y += self.vel_y

        # Clamp to ground
        if self.rect.bottom >= self.ground_y:
            self.rect.bottom = self.ground_y
            self.vel_y = 0
            self.on_ground = True

    def update(self):
        self.animate()
        self.apply_gravity()

    def animate(self):
        self.current_image += self.anim_speed
        if self.current_image >= 2:
            self.current_image = 0
        feet = self.rect.midbottom
        if self.ducking:
            self.image = self.ducking_sprites[int(self.current_image)]
        else:
            self.image = self.running_sprites[int(self.current_image)]
        # keep feet glued to ground when sprite size changes
        self.rect = self.image.get_rect(midbottom=feet)

class Cactus(pygame.sprite.Sprite):
    def __init__(self, x_pos, ground_y):
        super().__init__()
        self.sprites = []
        for i in range(1, 7):
            current_sprite = pygame.transform.scale(
                pygame.image.load(f"assets/cacti/cactus{i}.png"), (100, 100)
            )
            self.sprites.append(current_sprite)
        self.image = random.choice(self.sprites)
        self.rect = self.image.get_rect(midbottom=(x_pos, ground_y))

    def get_hitbox(self):
        return self.rect.inflate(-25, -10)

    def update(self, dt, game_speed):
        self.rect.x -= game_speed * dt

# === Variables ===
game_speed = BASE_SPEED          
elapsed_time = 0.0               
player_score = 0.0
prev_milestone = 0               
game_over = False
obstacle_timer = 0
obstacle_spawn = False
obstacle_cooldown = 1000  # ms

# Surfaces
ground = pygame.image.load("assets/ground.png")
ground = pygame.transform.scale(ground, (1280, 20))
ground_x = 0.0

cloud_img = pygame.image.load("assets/cloud.png")
cloud_img = pygame.transform.scale(cloud_img, (200, 80))

# Groups
cloud_group = pygame.sprite.Group()
obstacle_group = pygame.sprite.Group()
dino_group = pygame.sprite.GroupSingle()
ptero_group = pygame.sprite.Group()  # not used here, but kept

# Objects
dinosaur = Dino(50, GROUND_Y)
dino_group.add(dinosaur)

# Sounds
death_sfx = pygame.mixer.Sound("assets/sfx/lose.mp3")
points_sfx = pygame.mixer.Sound("assets/sfx/100points.mp3")
jump_sfx = pygame.mixer.Sound("assets/sfx/jump.mp3")

# Events
CLOUD_EVENT = pygame.USEREVENT
pygame.time.set_timer(CLOUD_EVENT, 3000)

# === UI helpers ===
def end_game():
    global player_score, game_speed
    game_over_text = game_font.render("Game Over!", True, "black")
    game_over_rect = game_over_text.get_rect(center=(640, 300))
    score_text = game_font.render(f"Score: {int(player_score)}", True, "black")
    score_rect = score_text.get_rect(center=(640, 340))
    replay_text = game_font.render("Press R to Replay OR 'JUMP' ", True, "black")
    replay_rect = replay_text.get_rect(center=(640, 380))
    screen.blit(game_over_text, game_over_rect)
    screen.blit(score_text, score_rect)
    screen.blit(replay_text, replay_rect)
    game_speed = BASE_SPEED
    cloud_group.empty()
    obstacle_group.empty()

def reset_game():
    global player_score, game_speed, game_over, ground_x, obstacle_timer, elapsed_time, prev_milestone
    game_over = False
    player_score = 0.0
    prev_milestone = 0
    game_speed = BASE_SPEED
    elapsed_time = 0.0
    ground_x = 0.0
    obstacle_timer = pygame.time.get_ticks()
    dinosaur.rect.midbottom = (50, GROUND_Y)
    dinosaur.vel_y = 0
    dinosaur.on_ground = True
    dinosaur.ducking = False
    dinosaur.current_image = 0
    cloud_group.empty()
    obstacle_group.empty()

# === Body Detection ===
def get_action():
    global calibrated, neutral_shoulder_y, jump_threshold, crouch_threshold, frame_skip_counter
    global calibration_start_time, last_action  # Remember last action for frame skips
    
    ret, frame = cap.read()
    if not ret:
        return "none", None
    
    frame_skip_counter += 1
    action = "none"
    
    # Only process pose every N frames to improve performance
    if frame_skip_counter % (FRAME_SKIP + 1) != 0:
        return last_action if 'last_action' in globals() else "none", frame
    
    # Resize frame for faster processing
    frame = cv2.resize(frame, (640, 480))
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    try:
        results = pose.process(rgb_frame)
    except Exception as e:
        # Handle potential MediaPipe errors gracefully
        print(f"Pose detection error: {e}")
        return "none", frame
    
    h, w, c = frame.shape

    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Check confidence thresholds
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP]
        
        # Skip if confidence is too low
        if left_shoulder.visibility < 0.5 or right_shoulder.visibility < 0.5:
            return last_action if 'last_action' in globals() else "none", frame

        avg_shoulder_y = int(((left_shoulder.y + right_shoulder.y) / 2) * h)

        # === Calibration (run once) ===
        if not calibrated:
            if calibration_start_time is None:
                calibration_start_time = time.time()
            
            neutral_shoulder_y = avg_shoulder_y
            torso_length = abs(int(left_hip.y * h) - neutral_shoulder_y)
            jump_threshold = neutral_shoulder_y - int(0.5 * torso_length)
            crouch_threshold = neutral_shoulder_y + int(0.5 * torso_length)
            calibrated = True
            calibration_start_time = None
            return "none", frame

        # === Action detection ===
        if avg_shoulder_y < jump_threshold:
            action = "jump"
        elif avg_shoulder_y > crouch_threshold:
            action = "crouch"
        else:
            action = "none"

        # === Draw landmarks (optional, can disable for speed) ===
        try:
            mp_draw.draw_landmarks(
                frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                mp_draw.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                mp_draw.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
            )

            # Debug thresholds
            cv2.line(frame, (0, jump_threshold), (w, jump_threshold), (0, 255, 0), 2)
            cv2.line(frame, (0, crouch_threshold), (w, crouch_threshold), (0, 0, 255), 2)
        except:
            pass  # Silently skip drawing if there's an error
    else:
        # No pose detected
        action = "none"
        
        # === Auto-calibrate if timeout is reached ===
        if not calibrated and calibration_start_time is not None:
            elapsed = time.time() - calibration_start_time
            if elapsed > CALIBRATION_TIMEOUT:
                print(f"Calibration timeout after {elapsed:.1f}s. Using default thresholds.")
                neutral_shoulder_y = h // 2
                jump_threshold = int(h * 0.35)
                crouch_threshold = int(h * 0.65)
                calibrated = True
                calibration_start_time = None

    last_action = action
    return action, frame

# === Game Loop ===
reset_game()  # initialize timers properly
while True:
    dt = clock.tick(120) / 1000.0  # seconds
    elapsed_time += dt

    # Smooth target speed and ease toward it
    target_speed = BASE_SPEED + ACCEL * elapsed_time
    alpha = 1.0 - math.exp(-SMOOTH_RATE * dt)  # framerate-independent smoothing
    game_speed += (target_speed - game_speed) * alpha

    # === Body detector input ===
    action, cam_frame = get_action()

    if action == "jump":
        dinosaur.jump()
        if game_over:
            game_over = False
            reset_game()
    elif action == "crouch":
        dinosaur.duck()
    else:
        dinosaur.unduck()

    # Keyboard (optional)
    keys = pygame.key.get_pressed()
    if keys[pygame.K_DOWN]:
        dinosaur.duck()
    else:
        dinosaur.unduck()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_SPACE, pygame.K_UP):
                dinosaur.jump()
                if game_over:
                    game_over = False
                    reset_game()
            if event.key == pygame.K_r and game_over:
                reset_game()
        if event.type == CLOUD_EVENT and not game_over:
            cloud_sprite = Cloud(cloud_img, 1280 + random.randint(0, 200), random.randint(50, 200))
            cloud_group.add(cloud_sprite)

    screen.fill("white")

    # === Show calibration status ===
    if not calibrated:
        if calibration_start_time is not None:
            elapsed = time.time() - calibration_start_time
            remaining = max(0, CALIBRATION_TIMEOUT - elapsed)
            calibration_text = game_font.render(f"CALIBRATING... ({remaining:.1f}s)", True, "blue")
        else:
            calibration_text = game_font.render("CALIBRATING... STAND IN FRAME", True, "blue")
        calibration_rect = calibration_text.get_rect(center=(640, 100))
        screen.blit(calibration_text, calibration_rect)

    # === Collisions with tightened hitboxes ===
    if not game_over:
        for obs in obstacle_group:
            if dinosaur.get_hitbox().colliderect(obs.get_hitbox()):
                game_over = True
                death_sfx.play()
                break

    if game_over:
        end_game()

    if not game_over:
        # milestone sound every +100 points
        player_score += 12.0 * dt  
        milestone = int(player_score // 100)
        if milestone > prev_milestone:
            points_sfx.play()
            prev_milestone = milestone

        # Spawn new obstacle on a variable cooldown (scaled by speed)
        if pygame.time.get_ticks() - obstacle_timer >= obstacle_cooldown:
            obstacle_spawn = True

        if obstacle_spawn:
            new_obstacle = Cactus(1280, GROUND_Y)  # align to ground line
            obstacle_group.add(new_obstacle)
            obstacle_timer = pygame.time.get_ticks()

            # cooldown in ms inversely related to speed (clamped)
            min_cd = int(max(500, 1800 - 0.9 * game_speed))
            max_cd = int(max(900,  2600 - 0.9 * game_speed))
            obstacle_cooldown = random.randint(min_cd, max_cd)

            obstacle_spawn = False

        # Draw score
        player_score_surface = game_font.render(str(int(player_score)), True, ("black"))
        screen.blit(player_score_surface, (1150, 10))

        # Updates
        cloud_group.update(dt, game_speed)
        cloud_group.draw(screen)

        dino_group.update()
        dino_group.draw(screen)

        obstacle_group.update(dt, game_speed)
        obstacle_group.draw(screen)

        # Ground scrolling (put ground at GROUND_Y-20 to line up the 20px texture height)
        ground_y_draw = GROUND_Y - 20
        ground_x -= game_speed * dt
        # wrap
        if ground_x <= -1280:
            ground_x += 1280
        screen.blit(ground, (ground_x, ground_y_draw))
        screen.blit(ground, (ground_x + 1280, ground_y_draw))

    # === Show camera feed in bottom-right corner ===
    if cam_frame is not None:
        cam_frame = cv2.cvtColor(cam_frame, cv2.COLOR_BGR2RGB)
        cam_frame = cv2.rotate(cam_frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        cam_surface = pygame.surfarray.make_surface(cam_frame)
        cam_surface = pygame.transform.scale(cam_surface, (200, 150))
        screen.blit(cam_surface, (1070, 560))

    pygame.display.update()
