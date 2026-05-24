# ============================================================
#  ROCK PAPER SCISSORS AI
#  Plays the game AND saves data so we can analyse it later
# ============================================================

# --- AI Memory ---
counts    = {"R": 0, "P": 0, "S": 0}
after_move = {
    "R": {"R": 0, "P": 0, "S": 0},
    "P": {"R": 0, "P": 0, "S": 0},
    "S": {"R": 0, "P": 0, "S": 0},
}

beats     = {"R": "S", "P": "R", "S": "P"}
beaten_by = {"R": "P", "P": "S", "S": "R"}
names     = {"R": "Rock", "P": "Paper", "S": "Scissors"}

wins = 0
draws = 0
losses = 0
last_move = None

# --- This list records every round for the analyser ---
round_log = []   # Each entry: (player_move, ai_move, ai_predicted, outcome)


def get_ai_move():
    total = counts["R"] + counts["P"] + counts["S"]
    predicted = None

    if total < 3:
        # Not enough data yet — always start with Paper, since it's the most common first move
        return "P", None

    if last_move is not None:
        follow = after_move[last_move]
        follow_total = follow["R"] + follow["P"] + follow["S"]
        if follow_total >= 2:
            predicted = max(follow, key=follow.get)

    if predicted is None:
        predicted = max(counts, key=counts.get)

    ai_move = beaten_by[predicted]
    return ai_move, predicted


def update_memory(player_move):
    global last_move
    if last_move is not None:
        after_move[last_move][player_move] += 1
    counts[player_move] += 1
    last_move = player_move


def get_player_move():
    while True:
        raw = input("Your move — R, P, or S (or Q to quit): ").strip().upper()
        if raw in ("R", "P", "S", "Q"):
            return raw
        print("  Invalid! Type R, P, or S.")


def play_round():
    global wins, draws, losses

    ai_move, predicted = get_ai_move()
    player_move = get_player_move()
    if player_move == "Q":
        return False

    update_memory(player_move)

    if player_move == ai_move:
        outcome = "DRAW"
        draws += 1
    elif beats[player_move] == ai_move:
        outcome = "YOU WIN"
        wins += 1
    else:
        outcome = "AI WINS"
        losses += 1

    round_log.append((player_move, ai_move, predicted, outcome))

    print(f"\n  You: {names[player_move]}  |  AI: {names[ai_move]}  |  {outcome}")
    print(f"  Score  →  You: {wins}  Draw: {draws}  AI: {losses}\n")
    return True


def main():
    print("=" * 45)
    print("   ROCK PAPER SCISSORS — AI LEARNS YOUR MOVES")
    print("=" * 45)
    print("Play some rounds, then run  analyse.py  to see")
    print("charts of how the AI did!\n")

    while True:
        if not play_round():
            break

    print(f"\n  Final → You: {wins}  Draw: {draws}  AI: {losses}")
    print("  Thanks for playing!\n")
    return round_log   # Return data so analyse.py can use it


if __name__ == "__main__":
    main()
