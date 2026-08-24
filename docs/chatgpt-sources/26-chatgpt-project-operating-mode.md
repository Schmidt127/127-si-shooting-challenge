# ChatGPT / OMNI Project Operating Mode — 127 SI Shooting Challenge

> **For:** ChatGPT planning sessions, OMNI in-base work, and cross-tool alignment with Cursor.
> **Repo:** `127-si-shooting-challenge`

**Canonical Cursor copy:** [AGENTS.md](../AGENTS.md) · `.cursor/rules/project-operating-mode.mdc`

**Future Work List:** [127-SI-MASTER-FUTURE-WORK-LIST.md](./127-SI-MASTER-FUTURE-WORK-LIST.md)

**Permanent workflow:** [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md)

---

## Master Future Work List (canonical)

The Master Future Work List is the **canonical source for future implementation work**. Items already listed there may proceed **without a separate backlog-ID approval**. New work must be added to the list and assigned an identifier **before** implementation.

Historical planning files ([v2-change-backlog.md](./v2-change-backlog.md), [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md)) are evidence only.

## High-autonomy disposable-data mode

**Activation:** Active when Mike or an approved Master Future Work List task identifies it.

During **high-autonomy disposable-data mode**, Mike has authorized task-scoped changes and deletion of transactional test records. This authorization **does not** include deleting tables, schemas, automations, scripts, operational configuration, protected evidence, payment records, secrets, or AWS/S3 objects.

**Weeks are excluded** — challenge-calendar/configuration records, not disposable transactional athlete data.

## Quality, Design, and Tool Usage

Agents should use every relevant tool, skill, library, and integration necessary to produce the best result. This includes Impeccable for website design and UI refinement, React Email for email templates, React-based document or interface components where appropriate, browser verification, automated testing, accessibility checks, and production-build validation.

Tools should be selected according to the task. Agents should not avoid a relevant tool merely because the work can be completed with a simpler implementation.

Websites, emails, documents, and user-facing interfaces must be reviewed for professional design, clarity, consistency, responsiveness, accessibility, and real-world usability.

Anti-AI design and writing principles must always be applied. Avoid generic layouts, repetitive card grids, excessive gradients, vague labels, unnecessary icons, awkward wording, artificial enthusiasm, filler content, and other recognizable low-quality AI patterns. User-facing work should feel intentional, specific to 127 Sports Intensity, and created for actual parents, athletes, coaches, and administrators.

User-facing changes must be visually verified in a browser or rendered preview, tested at appropriate screen sizes, and checked for accessibility before production deployment.

Do not force a tool into a task where it is not applicable. Use the best relevant tool for the work.

## What this mode does not relax

Reviewable PRs, tests, protected branches, DEV-before-Production, promotion documentation, merge approval, and four-agent hard stops remain required.
