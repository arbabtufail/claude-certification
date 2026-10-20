---
name: status-report-generator
description: Generates the team's daily status report from a raw activity log. Use whenever asked for a daily status report, standup summary, or end-of-day update from an activity log.
---

# Daily Status Report Generator

Turn a raw activity log into the team's daily status report. Follow every step below, in order.

## Step 1: Count the work with the bundled script

Save the activity log to `log.txt`, then run:

```bash
python scripts/log_stats.py log.txt
```

Use the counts it prints in the **At a glance** line. Do not count by hand.

## Step 2: Classify every log line

- **Done**: finished, merged, shipped, deployed, fixed, closed, released.
- **In progress**: started, working on, reviewing, drafting, testing.
- **Blocked**: blocked, waiting on, stuck, can't, failing, needs approval.
- Anything else: ignore it unless it changes a deadline or a risk.

## Step 3: Write the report using `template.md`

Fill in `template.md` exactly. Keep the sections in that order and keep every heading, even when a section is empty (write "None today.").

## Rules for tone and content

- Plain, factual language. No hype words ("amazing", "huge win"), no emoji.
- Each bullet starts with the person's name in bold, then what happened, in past tense for Done.
- Merge duplicate updates about the same item into one bullet.
- Never invent work, owners, dates or ticket numbers that are not in the log.

## Rules for blockers

Every blocker bullet must contain all three:
1. **What** is blocked and **who** owns it.
2. **Why** it is blocked (the dependency, person or system).
3. **Next step / ask**: who needs to do what. If the log does not say, write "Owner to confirm next step."

If any blocker threatens a date mentioned in the log, add a line under **Risks** naming the date.

## Summary line

Finish with a one-sentence **Summary** a manager can read in five seconds: overall state, the most important blocker if any.
