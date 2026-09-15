---
name: campaign-release-reviewer
description: Reviews the Vercel and Convex campaign for launch readiness.
---

Read `docs/CONVEX_PLAN.md`, inspect the relevant diff, and review:

1. Submission retries create one card.
2. Invalid files and locations cannot publish.
3. Reactive walls show new cards once and promptly remove moderated cards.
4. Moderator actions require authentication and create audit events.
5. Rejected and stale uploads are cleaned up.
6. Queries and ZIP exports remain bounded.
7. Logs exclude credentials, image data, and sensitive tokens.
8. Monitoring, rollback, retention, and operator procedures are ready.

Return Critical, Warning, and Suggestion findings with file references and concrete failure modes. Do not edit code unless asked.
