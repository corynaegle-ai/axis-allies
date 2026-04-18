# Global Instructions

## Coding Workflow Procedure

When writing code (epic implementation, ad-hoc coding requests, bug fixes), follow this procedure strictly:

### 1. Plan, define acceptance criteria, and ticket the work
- For non-trivial work, create an epic and break it into tickets using `bd create`.
- Use parallel agents to create tickets faster when there are many.
- **Define acceptance criteria for each ticket before implementation begins.** Each ticket must have clear, testable conditions that define "done":
  - Acceptance criteria should be specific and measurable (not vague like "works correctly").
  - Cover the happy path, key edge cases, and integration points.
  - Include any required API contracts, data model changes, or UI behaviors.
  - Format as a checklist (e.g., "[ ] Endpoint returns 200 with enrichment data for a valid contact").
  - **For tickets that touch AI behavior** (prompts, pipeline logic, model calls, intelligence services): include eval criteria that define what "good output" looks like — not just "it runs," but "it produces correct results." Examples:
    - "[ ] Categorization returns 'meeting-notes' for a transcript capture, not 'general'"
    - "[ ] Entity linker matches 'John from Acme' to the correct contact, not a fuzzy false positive"
    - "[ ] Commitment detection does NOT extract social pleasantries ('let's grab coffee') as commitments"
    - Include at least 3 positive examples (should match) and 2 negative examples (should NOT match) per AI behavior change.
- After all tickets are created, **audit them for correctness**:
  - Titles are clear and actionable.
  - Priorities are appropriate (P0 = critical/broken, P1 = foundational, P2 = important, P3 = nice-to-have).
  - Dependencies between tickets are set (e.g., deploy script depends on PM2 config).
  - No duplicates or overlapping scope.
  - Acceptance criteria are complete, testable, and unambiguous.
  - Fix any issues found before implementation begins.
- For small ad-hoc requests or quick bug fixes, skip ticketing and go straight to step 2.

### 2. Delegate to background agents
- Use a team of background agents to do the implementation work.
- Keep the main conversation window free so the user can continue talking.
- Use `run_in_background: true` agents for coding tasks, and report back concisely when they complete.
- **Agents must NOT commit or push independently.** All code changes are batched into a single commit after all agents complete and the code passes review, fixes, tests, and API verification. This avoids burning CI/CD minutes on partial work (each push to main triggers a full CI run).

### 2b. Ignore throttling
- Do NOT add, modify, or review rate limiting / throttle decorators during implementation or code review.
- Throttling is disabled in dev (`THROTTLE_DISABLED=true`) and will be configured separately before launch.
- If a code review agent flags throttling issues, ignore them.

### 2c. Agent output triage (before code review)
- After all agents complete, **before** starting the deep code review, triage each agent's output against its ticket:
  - **Spec drift check**: Diff the ticket's acceptance criteria against the actual changeset. Flag anything the agent added that wasn't asked for (extra features, refactored neighbors, new abstractions, added comments/docs to untouched code).
  - **Scope check**: Flag anything in the acceptance criteria that the agent didn't address or only partially addressed.
  - **Conflict check**: When multiple agents worked in parallel, scan for conflicting patterns — duplicate utility functions, inconsistent naming, incompatible interfaces, or contradictory approaches to the same problem.
- Fix spec drift and conflicts before proceeding to code review. Do not review code that doesn't match the spec — send it back or fix it first.

### 3. Deep-dive code review after completion
- After an epic is finished or an ad-hoc coding request is completed, run a thorough code review.
- The review should cover: correctness, security (OWASP top 10), performance, error handling, code style consistency, edge cases, and adherence to existing patterns.
- Classify issues as: Critical, High, Medium, Low.
- **Blast radius tiering** — not all code gets the same level of scrutiny:
  - **Tier 1 (human spot-check required)**: Auth/security, data persistence/migrations, financial logic, intelligence pipeline prompts/services, anything that touches user data at rest. Flag these files explicitly in the review summary so Cory can review them.
  - **Tier 2 (thorough agent review)**: API endpoints, business logic, state management, service integration points.
  - **Tier 3 (standard agent review)**: UI components, styling, configuration, utilities, tests.
- The review summary must list every Tier 1 file with a one-line description of what changed and why, so Cory can prioritize his review time.

### 4. Fix all issues
- After the code review, fix all issues (Critical, High, Medium, and Low).
- The app should be polished — no known issues left unfixed.

### 5. Test verification pass
- Verify existing tests still pass — run the full test suite and fix any regressions.
- Ensure new code has adequate test coverage:
  - New modules/services should have unit tests.
  - New API endpoints should have integration or e2e tests.
  - Bug fixes should include a regression test proving the fix works.
- If test coverage is insufficient, write the missing tests before proceeding.
- **Sanity check all tests** — review every new test to ensure it adds real value:
  - No tautologies (tests that can never fail, e.g., asserting a hardcoded value equals itself).
  - No mock-only tests that just verify a mock was called without testing real logic (e.g., testing that a filter returns what the mock returns).
  - Tests should exercise actual business logic, edge cases, or integration points.
  - If a test doesn't catch a real bug when the code breaks, delete it and write one that does.

### 5b. AI output quality verification
- **Only applies when the changeset touches AI behavior**: prompts, intelligence pipeline services (CategorizationService, CommitmentService, TopicService, EntityLinkerService, BriefingService, SynthesisService, RankingService), model calls, or extraction logic.
- Run the eval criteria from the ticket's acceptance criteria as actual tests:
  - Feed the positive examples through the changed service and verify correct output.
  - Feed the negative examples through and verify they are correctly rejected/excluded.
  - If a golden dataset exists for the service (see `tests/evals/`), run the full eval suite and report precision/recall before and after the change.
- **No prompt change ships without a before/after comparison.** If you're modifying a prompt, run at least 5 representative inputs through both the old and new prompt, and report the differences. Regressions must be justified or fixed.
- If no golden dataset exists yet and the change is significant (new service, major prompt rewrite), create a seed eval set of 10-20 labeled examples in `tests/evals/<service-name>/` before committing.

### 6. API verification pass
- Launch an agent or team of agents to verify API calls for:
  - URL accuracy (correct endpoints, paths)
  - Data types (request/response payloads)
  - Field names (match backend schema exactly)
  - Parameter names (query params, body fields)
- Fix all issues found.

### 6b. Cross-agent consistency check
- When multiple agents contributed to the changeset, run a final consistency pass:
  - Search for duplicate functions/utilities that do the same thing (agents independently create helpers).
  - Verify import paths are consistent — no agent created a local copy of something that exists in shared code.
  - Check for naming inconsistencies introduced across agent boundaries (e.g., one agent uses `userId`, another uses `user_id` in the same context).
  - Verify that interfaces/types shared across agent boundaries are compatible (e.g., if agent A produces a response and agent B consumes it, do the shapes match?).
- Fix all inconsistencies before committing.

### 7. Acceptance criteria verification
- Before committing, verify that **every ticket's acceptance criteria are met**.
- Walk through each criterion checklist item and confirm it passes (via tests, manual inspection, or API verification).
- If any acceptance criterion is not met, fix the issue before proceeding. Do not commit incomplete work.
- Mark each ticket's criteria as satisfied, then close the ticket with `bd close`.

### 8. Commit and push to main
- Stage and commit the completed, reviewed, and fixed code.
- Push to main. This triggers the CI/CD pipeline automatically:
  - **CI** (GitHub Actions): lint → typecheck → test → build. If any step fails, the deploy is blocked.
  - **CD** (GitHub Actions): on CI success, SSHs into the DEV server and runs `scripts/deploy.sh` (git pull, install, migrate, build, PM2 reload, health check, auto-rollback on failure).
- Monitor CI status: `gh run list --limit 1` or check GitHub Actions.
- If CI fails, fix the issue and push again — do not bypass CI.

### 9. Verify deployment
- **Web/API**: CI/CD handles deployment automatically. Verify by checking:
  - CI passed: `gh run list --workflow=ci.yml --limit 1`
  - Deploy succeeded: `gh run list --workflow=deploy.yml --limit 1`
  - Health check: `curl -sf https://api.synari.net/api/v1/health`
- **iOS applications**: Build and refresh in the simulator or on the connected physical device (no CI/CD — manual Xcode build).
- **macOS applications**: Build with `./run.sh` (no CI/CD — manual build).
