import pygame
import random
import time
import sys
import argparse
import requests
import numpy as np

# --- Configuration & Constants ---
WIDTH, HEIGHT = 800, 600
FPS = 60
MOLE_SIZE = 100
HOLE_SIZE = 120
TIMER_LIMIT = 60  # 60 seconds game

# Colors
WHITE = (255, 255, 255)
GREEN = (34, 139, 34)
BROWN = (139, 69, 19)
RED = (220, 20, 60)
BLUE = (30, 144, 255)
DARK_BROWN = (101, 67, 33)
TEXT_COLOR = (255, 255, 255)

# --- Math Logic ---
def generate_math_problem(difficulty):
    """Generates a math problem based on difficulty."""
    if difficulty == 1: # Easy
        a = random.randint(1, 10)
        b = random.randint(1, 10)
        op = "+"
        ans = a + b
    elif difficulty == 2: # Medium
        a = random.randint(10, 25)
        b = random.randint(1, 15)
        op = random.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
    else: # Hard
        a = random.randint(20, 50)
        b = random.randint(10, 40)
        op = random.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
    
    return f"{a} {op} {b}", ans

def get_mole_count(difficulty):
    """Returns number of moles based on difficulty."""
    if difficulty == 1: return random.randint(3, 4)
    if difficulty == 2: return random.randint(5, 6)
    return random.randint(8, 9)

# --- Pygame Classes ---
class Mole:
    def __init__(self, x, y, value, is_correct):
        self.rect = pygame.Rect(x, y, MOLE_SIZE, MOLE_SIZE)
        self.value = value
        self.is_correct = is_correct
        self.start_time = time.time()
        self.duration = random.uniform(1.5, 3.0)
        self.alpha = 255
        self.y_offset = MOLE_SIZE

    def update(self):
        elapsed = time.time() - self.start_time
        if elapsed < 0.5: # Pop up
            self.y_offset = MOLE_SIZE * (1 - (elapsed / 0.5))
        elif elapsed > self.duration - 0.5: # Pop down
            self.y_offset = MOLE_SIZE * ((elapsed - (self.duration - 0.5)) / 0.5)
        else:
            self.y_offset = 0
        
        return elapsed < self.duration

    def draw(self, screen, font):
        # Draw hole
        pygame.draw.ellipse(screen, DARK_BROWN, (self.rect.x - 10, self.rect.y + MOLE_SIZE - 20, HOLE_SIZE, 40))
        
        # Draw mole (clipping it so it looks like it's coming out of the hole)
        mole_surface = pygame.Surface((MOLE_SIZE, MOLE_SIZE), pygame.SRCALPHA)
        pygame.draw.circle(mole_surface, BROWN, (MOLE_SIZE//2, MOLE_SIZE//2), MOLE_SIZE//2)
        # Eyes
        pygame.draw.circle(mole_surface, (0,0,0), (MOLE_SIZE//3, MOLE_SIZE//3), 5)
        pygame.draw.circle(mole_surface, (0,0,0), (2*MOLE_SIZE//3, MOLE_SIZE//3), 5)
        # Nose
        pygame.draw.circle(mole_surface, RED, (MOLE_SIZE//2, MOLE_SIZE//2), 8)
        
        # Draw value
        txt = font.render(str(self.value), True, WHITE)
        txt_rect = txt.get_rect(center=(MOLE_SIZE//2, MOLE_SIZE//2 + 20))
        mole_surface.blit(txt, txt_rect)

        # Blit with offset
        screen.blit(mole_surface, (self.rect.x, self.rect.y + self.y_offset))

# --- Main Game Loop ---
def run_game(difficulty, student_id=None, token=None, server="http://127.0.0.1:8000"):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Whack-a-Mole Math!")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 32)
    large_font = pygame.font.SysFont("Arial", 48)

    score = 0
    total_questions = 0
    start_time = time.time()
    
    moles = []
    current_problem, correct_answer = generate_math_problem(difficulty)
    mole_positions = []
    
    # Grid positions for moles
    cols = 3 if difficulty == 1 else (4 if difficulty == 2 else 5)
    rows = 2 if difficulty == 1 else (3 if difficulty == 2 else 3)
    margin_x = (WIDTH - (cols * HOLE_SIZE)) // (cols + 1)
    margin_y = (HEIGHT - 100 - (rows * HOLE_SIZE)) // (rows + 1)
    
    for r in range(rows):
        for c in range(cols):
            mole_positions.append((margin_x + c * (HOLE_SIZE + margin_x), 100 + margin_y + r * (HOLE_SIZE + margin_y)))

    next_mole_spawn = 0

    running = True
    while running:
        screen.fill(GREEN)
        
        elapsed_game_time = time.time() - start_time
        remaining_time = max(0, TIMER_LIMIT - int(elapsed_game_time))
        
        if remaining_time == 0:
            running = False

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEBUTTONDOWN:
                pos = event.pos
                for mole in moles:
                    if mole.rect.collidepoint(pos) and mole.y_offset < 20: # Must be "up" enough
                        if mole.is_correct:
                            score += 1
                            # Correct! Refresh problem
                            current_problem, correct_answer = generate_math_problem(difficulty)
                            total_questions += 1
                            moles = [] # Clear moles to spawn new ones for next problem
                        else:
                            score = max(0, score - 1) # Penalty
                        break

        # Spawn logic
        if not moles and time.time() > next_mole_spawn:
            count = get_mole_count(difficulty)
            chosen_pos = random.sample(mole_positions, count)
            
            # One correct, others wrong
            wrong_answers = set()
            while len(wrong_answers) < count - 1:
                wa = correct_answer + random.randint(-10, 10)
                if wa != correct_answer:
                    wrong_answers.add(wa)
            
            answers = [correct_answer] + list(wrong_answers)
            random.shuffle(answers)
            
            for i in range(count):
                moles.append(Mole(chosen_pos[i][0], chosen_pos[i][1], answers[i], answers[i] == correct_answer))
            
        # Update and Draw Moles
        moles = [m for m in moles if m.update()]
        for mole in moles:
            mole.draw(screen, font)

        # UI Overlay
        # Top bar
        pygame.draw.rect(screen, BLUE, (0, 0, WIDTH, 80))
        prob_txt = large_font.render(f"Problem: {current_problem} = ?", True, WHITE)
        screen.blit(prob_txt, (20, 15))
        
        score_txt = font.render(f"Score: {score}", True, WHITE)
        screen.blit(score_txt, (WIDTH - 150, 10))
        
        time_txt = font.render(f"Time: {remaining_time}s", True, WHITE)
        screen.blit(time_txt, (WIDTH - 150, 45))

        pygame.display.flip()
        clock.tick(FPS)

    # Game Over Screen
    final_score = score / max(1, total_questions) if total_questions > 0 else 0
    
    # Submit score
    if student_id and token:
        try:
            url = f"{server.rstrip('/')}/api/games/attempt/"
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            payload = {
                "game_id": "whack_a_mole_math",
                "score": min(1.0, final_score),
                "difficulty_level": difficulty,
                "completed": True,
                "game_data": {
                    "total_score": score,
                    "total_questions": total_questions,
                    "duration_seconds": int(time.time() - start_time)
                }
            }
            requests.post(url, json=payload, headers=headers, timeout=5)
        except Exception as e:
            print(f"Failed to submit score: {e}")

    show_game_over(screen, large_font, font, score)
    pygame.quit()

def show_game_over(screen, large_font, font, score):
    screen.fill(BLUE)
    txt = large_font.render("GAME OVER!", True, WHITE)
    screen.blit(txt, (WIDTH//2 - 120, HEIGHT//2 - 100))
    
    txt2 = font.render(f"Final Score: {score}", True, WHITE)
    screen.blit(txt2, (WIDTH//2 - 80, HEIGHT//2))
    
    txt3 = font.render("Press any key to exit", True, WHITE)
    screen.blit(txt3, (WIDTH//2 - 110, HEIGHT//2 + 100))
    
    pygame.display.flip()
    
    waiting = True
    while waiting:
        for event in pygame.event.get():
            if event.type in [pygame.QUIT, pygame.KEYDOWN, pygame.MOUSEBUTTONDOWN]:
                waiting = False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--difficulty", type=int, default=1)
    parser.add_argument("--student-id", help="Student Firebase UID")
    parser.add_argument("--token", help="Firebase ID Token")
    parser.add_argument("--server", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    
    run_game(args.difficulty, args.student_id, args.token, args.server)
