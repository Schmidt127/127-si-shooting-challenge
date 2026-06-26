# 127 SI Shooting Challenge

Documentation and automation source for the **127 Sports Intensity Shooting Challenge** — an Airtable-based youth basketball shooting challenge system.

> **Repo name vs product:** This GitHub repo is named for the Shooting Challenge backend. The Next.js app in [`web/`](./web/) is the **Hoop Challenges** hub (Shooting Challenge, JR Referee Clinics, Dribble Challenge, Tournament Brackets, etc.) and will replace Softr.io over time.

## Purpose

This repository is the source of truth for Airtable automation scripts, Airtable schema notes, Airtable extension audit scripts, the Next.js participant website (`web/`), Make.com blueprints, documentation, and recovery procedures.

The app tracks athlete enrollments, shooting submissions, XP, levels, streaks, homework, video feedback, Zoom attendance, weekly summaries, and parent/coach communication.

**This is not the Team Shot Tracker repo.** That is a separate project with its own repository and scope.

## Main Systems and Tools

| System | Role |
|--------|------|
| **Airtable** | Live production environment — data, automations, and extensions |
| **Make.com** | External workflows (Google Drive, Gmail, webhooks, and related scenarios) |
| **GitHub** | Versioned scripts, schema notes, blueprints, docs, and recovery procedures |
| **Cursor** | Local code and documentation editor |
| **Next.js / Vercel** | Participant website (Softr replacement) — see [`web/`](./web/) |
| **ChatGPT** | Architecture review, script review, debugging, audit design, and documentation support |

## Repository Layout

```
.
├── README.md                 # Project introduction (this file)
├── CHANGELOG.md              # Notable changes (Airtable / Web / Make sections)
├── SYSTEM_OVERVIEW.md        # App modules, data flow, and architecture goals
├── docs/                     # Ops docs — start at docs/README.md (index)
│   └── jr-ref/               # JR Referee Clinics program docs
├── airtable/
│   ├── schema/               # Schema notes, snapshots (shooting-challenge + jr-ref/)
│   ├── automations/          # Native Airtable automation scripts
│   │   ├── shooting-challenge/
│   │   └── jr-referee-clinics/
│   ├── extension-scripts/
│   │   ├── audits/           # Dry-run audit extension scripts (Stages A–J)
│   │   ├── safe-backfills/   # Controlled backfill extension scripts
│   │   └── schema/           # In-base schema export (Scripting extension)
│   └── formulas/             # Formula and rollup documentation
├── web/                      # Next.js Hoop Challenges site (Vercel root directory)
│   ├── app/                  # App Router pages
│   ├── components/           # UI by feature
│   ├── lib/                  # Airtable client, data mappers, nav
│   └── docs/                 # Web-specific planning (site-hierarchy.md)
├── make/
│   ├── blueprints/           # Exported Make.com scenario blueprints
│   ├── documentation/        # Scenario notes and webhook standards
│   └── test-payloads/        # Sample JSON for webhook testing
├── tools/
│   └── airtable/             # Python schema export and PAT verify scripts
├── .cursor/rules/            # Canonical Cursor AI rules
├── .github/workflows/        # CI (web.yml)
└── cursor/rules.md           # Pointer to .cursor/rules/
```

See [docs/README.md](./docs/README.md) for the full documentation map and [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) for module-level detail.

## Development Workflow

1. **Edit locally in Cursor** — Scripts, schema notes, and documentation live in this repo.
2. **Review with ChatGPT** — Use for architecture, script review, debugging, and audit design before deploying changes.
3. **Deploy to Airtable** — Copy or sync automation scripts and schema updates into the live Airtable base.
4. **Update Make.com** — Apply blueprint changes and test external workflows (Drive, Gmail, webhooks).
5. **Document changes** — Update `CHANGELOG.md` and schema notes for any production-impacting change.
6. **Run audit scripts** — Use dry-run audit scripts to verify data integrity before and after changes.

## Source-of-Truth Rule

- **GitHub** holds the canonical version of scripts, schema documentation, Make.com blueprints, and recovery procedures.
- **Airtable** is the live production database and automation runtime.
- **Make.com** runs external integrations defined by blueprints stored here.

When production and GitHub diverge, treat GitHub as the target state and reconcile Airtable/Make.com to match after review.

## Getting Started

1. Clone this repository.
2. Read [docs/README.md](./docs/README.md) for the documentation index.
3. Read [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) for modules, data flow, and architecture goals.
4. Review [CHANGELOG.md](./CHANGELOG.md) before pulling updates or deploying changes.
5. **Website:** `cd web && npm install && npm run dev` — see [web/README.md](./web/README.md).
