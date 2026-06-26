# JR Referee Clinics — getting started

Same workflow as Shooting Challenge: **Cursor → GitHub → Airtable (source of truth) → Vercel (public site)**.

## 1. Open in Cursor

1. Open **`hoop-projects.code-workspace`** in Cursor (or open repo `127-si-shooting-challenge` directly).
2. JR Ref code and docs live in this repo alongside Shooting Challenge — not a separate GitHub project.
3. Web app: `web/` folder. JR Ref pages: `web/app/jr-referee-clinics/`.

## 2. Local secrets (never commit)

### Website (`web/.env.local`)

```env
AIRTABLE_API_TOKEN=pat...          # shared PAT — needs read on both bases
AIRTABLE_BASE_ID=app...            # Shooting Challenge base
JR_REF_AIRTABLE_BASE_ID=app...     # 127SI - JR REF base
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Schema export (`tools/airtable/jr-ref/.env`)

```powershell
cd tools\airtable\jr-ref
copy .env.example .env
# Edit .env — JR REF base ID + same PAT
pip install -r ..\requirements.txt
python export_schema.py -v
```

Snapshots land in `airtable/schema/jr-ref/snapshots/YYYY-MM-DD/`.

## 3. GitHub

- Repo: [Schmidt127/127-si-shooting-challenge](https://github.com/Schmidt127/127-si-shooting-challenge)
- Commit JR Ref work under the same branches as the hub site (`master` → Vercel).
- After schema export: commit dated snapshot folder + update `airtable/schema/jr-ref/current/*.md`.

## 4. Vercel (same project as hoopchallenges.com)

| Setting | Value |
|---------|--------|
| Root Directory | `web` |
| Production URL | `https://www.hoopchallenges.com` |

Add env var (Production + Preview):

| Variable | Value |
|----------|--------|
| `JR_REF_AIRTABLE_BASE_ID` | Base ID for **127SI - JR REF** |

Health check: `GET /api/jr-ref/airtable` → `{ ok: true }` when configured.

## 5. Fillout → Airtable

Fillout.com forms write registrations into **127SI - JR REF**:

- JR Ref Participants
- Mentor Montana Officials
- Teams

The website **reads** Airtable only (Phase 1). Registration stays on Fillout unless you later add embed links.

## 6. First tasks with Cursor AI

Paste this when starting a session:

```
Program: JR Referee Clinics
Airtable base: 127SI - JR REF
Web prefix: /jr-referee-clinics
Docs: docs/jr-ref/README.md
Schema: airtable/schema/jr-ref/current/
```

## 7. Pull schema (do this early)

```powershell
cd C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\tools\airtable\jr-ref
python export_schema.py -v
```

Then open `airtable/schema/jr-ref/snapshots/<today>/schema_doc_*.md` and update `table-map.md` / `field-map.md` with real table names.
