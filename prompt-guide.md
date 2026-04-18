# Prompt Construction Guide

When the user says "follow the prompt guide", use this document to collaboratively build a high-quality implementation prompt. The goal is a prompt that can be handed to Claude Code and executed through the coding workflow (CLAUDE.md steps 1-9) with minimal correction loops.

## The Process

### Step 1: Extract the Five Prompt Components

Every good implementation prompt needs these five components. Interview the user to fill each one. Don't guess — ask.

**1. Outcome** — What does "done" look like?
- Not "build a thing" but "build a thing that does X, Y, Z"
- Ask: "What should exist when this is finished that doesn't exist now?"
- Ask: "How will you know it's working?"

**2. Context** — What exists today?
- What's already built that this touches or depends on?
- What patterns/conventions does the codebase already use for similar things?
- What has been tried before (if anything)?
- Don't make the user tell you things you can look up — grep/read the codebase first, then confirm.

**3. Boundaries** — What's in scope and what's out?
- Explicit inclusions: "Build X, Y, Z"
- Explicit exclusions: "Do NOT build A, B, C"
- Negative examples are as important as positive ones — they prevent drift
- Ask: "Is there anything you do NOT want changed or touched?"
- Ask: "What's the simplest version of this that would be useful?"

**4. Priority & Sequencing** — What order, and what matters most?
- If multiple things to build, what comes first?
- What's the most important thing to get right?
- What can be deferred or skipped?
- Ask: "If you could only ship one part of this, which part?"

**5. Quality Definition** — What does "good" look like for THIS feature?
- For AI behavior: positive examples (should do X) and negative examples (should NOT do Y)
- For UI: specific interactions, states, error handling
- For APIs: exact contracts, field names, response shapes
- For infrastructure: performance requirements, failure modes
- Ask: "What's the most likely way this could go wrong?"

### Step 2: Research Before Drafting

Before writing the prompt, explore the codebase to fill in the Context component:
- Find the files that will be modified or serve as patterns
- Identify existing utilities, services, or patterns to reuse
- Check for dependencies or constraints the user might not have mentioned
- Note the test patterns used in the area of the code being changed

Present findings to the user: "Here's what I found — does this match your understanding?"

### Step 3: Draft the Prompt

Structure the prompt in this order:

```
<one-line goal statement>

Goal: <2-3 sentences explaining what this builds and why>

What exists today:
- <bullet points about current state, derived from Step 2>

What to build:
- <concrete deliverables, not vague direction>
- <each item should be independently verifiable>

Priority order:
1. <most important / foundational>
2. <depends on 1>
3. <nice to have, or can be skipped>

Constraints:
- <explicit negative instructions — what NOT to do>
- <technical constraints — what frameworks, patterns to follow>
- <scope limits — what to skip or defer>

What "good" looks like:
- <specific examples of correct behavior>
- <specific examples of incorrect behavior>
- <the most likely failure mode and how to avoid it>
```

### Step 4: Review Checklist

Before finalizing, verify the prompt against these criteria:

```
[ ] Self-contained — An agent with no prior context can execute this
[ ] Outcome is testable — You can verify "done" without subjective judgment
[ ] Boundaries prevent drift — Negative instructions block common agent over-builds
[ ] Priority is explicit — Agent knows what to build first and what to skip
[ ] Quality has examples — At least 3 positive and 2 negative examples for AI behavior
[ ] Context is current — File paths and patterns verified against actual codebase
[ ] No implementation dictation — Says WHAT not HOW (unless the HOW matters for correctness)
[ ] Constraints are justified — Each constraint has a reason (even if brief)
[ ] Size matches harness — Work is scoped to what a single agent session can complete
[ ] Acceptance criteria exist — Clear conditions that define when each deliverable is done
```

### Step 5: Size Assessment

Evaluate whether the prompt should be:
- **Single agent** — One focused task, <10 files, no dependencies between parts
- **Sequential agents** — Part B depends on Part A's output
- **Parallel agents** — Independent parts that don't touch the same files

If the prompt is too large for a single agent, split it into sub-prompts and note the dependency graph.

## Anti-Patterns to Flag

When reviewing a draft prompt, flag these:

| Anti-Pattern | Problem | Fix |
|---|---|---|
| "Build however you think is best" | Blank check for drift | Add boundaries and quality definition |
| "Follow the existing patterns" | Which patterns? There are many | Name the specific file/pattern to follow |
| No negative examples | Agent will over-include | Add "should NOT" examples |
| Implementation steps instead of outcomes | Fragile if assumptions are wrong | Describe what, not how |
| Missing priority order | Agent builds easiest thing first | Number the deliverables by importance |
| "Make it production-ready" | Means nothing specific | Define what production-ready means here |
| Vague quality bar ("works correctly") | Untestable | Add specific input/output examples |
| No existing-state context | Agent guesses at current codebase | Research first, then write the prompt |

## Prompt Size Guide

A good prompt is 200-500 words for a single-agent task. Under 200 words usually means missing context or boundaries. Over 500 words might mean the task should be split.

Exception: golden datasets, large fixture data, or detailed API contracts can push past 500 words — that's fine because the extra length is data, not ambiguity.

## Example Interaction

User: "Follow the prompt guide and build a prompt to implement push notifications for pre-meeting reminders"

Claude's process:
1. Ask the 5 component questions (or research + confirm)
2. Grep the codebase for notification infrastructure, briefing scheduler, appointment schema
3. Present findings: "I found NotificationService at X, BriefingSchedulerService at Y, appointments table has startTime. Does this match?"
4. Draft the prompt with all 5 components filled
5. Run the review checklist
6. Present to user for approval before executing
