"""Count done / in-progress / blocked lines in an activity log.

Usage: python scripts/log_stats.py log.txt
"""
import re
import sys

DONE = r"\b(finished|merged|shipped|deployed|fixed|closed|released|completed|done)\b"
BLOCKED = r"\b(blocked|waiting on|stuck|can't|cannot|failing|needs approval)\b"
IN_PROGRESS = r"\b(started|working on|reviewing|drafting|testing|in progress)\b"


def classify(line: str) -> str | None:
    text = line.lower()
    # Blocked wins over everything: "started X but blocked on Y" is a blocker.
    if re.search(BLOCKED, text):
        return "blocked"
    if re.search(DONE, text):
        return "done"
    if re.search(IN_PROGRESS, text):
        return "in_progress"
    return None


def main(path: str) -> None:
    counts = {"done": 0, "in_progress": 0, "blocked": 0, "other": 0}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            counts[classify(line) or "other"] += 1
    print(f"done={counts['done']} in_progress={counts['in_progress']} blocked={counts['blocked']} other={counts['other']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/log_stats.py log.txt")
    main(sys.argv[1])
