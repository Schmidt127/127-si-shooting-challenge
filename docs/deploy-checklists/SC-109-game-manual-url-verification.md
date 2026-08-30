# SC-109 / EXT-QA-001 — Game Manual URL verification (Vercel env)

| Field | Value |
|-------|--------|
| Date | 2026-08-30 |
| Status | **Ready for Mike review** — repo page live; Production PDF env unset |
| Backlog | **SC-109**, **EXT-QA-001** |
| Related | V2-008 game manual · SC-133 pre-season comms (blocked until SC-109 complete) |
| Public route | `https://www.fairfieldbasketballclub.com/shoot/game-manual` |
| Repo | `Schmidt127/127-si-shooting-challenge` — `web/` Vercel root |

## What is already live in Production

The `/shoot/game-manual` route renders **live configuration** from Airtable (no mock data):

| Section | Source | Renders when |
|---------|--------|--------------|
| How you earn XP | `XP Reward Rules` (Active Rules Only view) | Airtable reachable |
| Level ladder | `Levels` table | Airtable reachable |
| Quick start | Static editorial copy in repo | Always |
| Adobe/PDF open link | `NEXT_PUBLIC_GAME_MANUAL_URL` | **Only when env is set** |

When the env var is unset, the page shows a public-safe **“Official manual link coming soon”** state — not an error, and never the raw env var name.

Repo reference: `web/lib/game-manual/config.ts` · `web/components/game-manual/game-manual-view.tsx`

---

## Vercel project — environment variable (Production)

Open the Vercel project that serves **`/shoot`**.  
**Settings → Environment Variables → Production** (set Preview too if previews should match).

| Variable | Required value | Notes |
|----------|----------------|--------|
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Mike-approved **HTTPS** URL to the Adobe Document Cloud / PDF game manual | Must start with `http://` or `https://`. Blank = “coming soon” state (current prod). |

**Do not log or paste secret values.** This variable is non-secret but should still be the final public document URL only.

### URL acceptance rules (repo)

- Trimmed whitespace only; no iframe embed (Adobe blocks embedding — page opens in a new tab).
- Invalid schemes (e.g. `javascript:`) are rejected; page falls back to “coming soon”.
- Direct S3 or Drive links are **not** used for the manual — Adobe/PDF host only per [`GAME-MANUAL-CONFIG-AUDIT.md`](../overnight/web-integration/GAME-MANUAL-CONFIG-AUDIT.md).

---

## Promotion steps (Mike)

Execute **in order**. No Airtable schema changes in this package.

| # | Action | Done |
|---|--------|------|
| 1 | Confirm the **2026–27 Game Manual** PDF is published at the approved Adobe (or equivalent HTTPS) URL | [ ] |
| 2 | Vercel → set Production `NEXT_PUBLIC_GAME_MANUAL_URL` to that URL | [ ] |
| 3 | (Optional) Set Preview env to the same URL for QA previews | [ ] |
| 4 | Trigger or wait for Vercel Production deploy from `master` | [ ] |
| 5 | Run production smoke (below) | [ ] |
| 6 | Visual check: `/shoot/game-manual` shows **Open game manual** → opens Adobe/PDF in new tab | [ ] |
| 7 | Confirm live XP rules + level ladder sections still render below the manual panel | [ ] |
| 8 | Update backlog: SC-109 → **Live Tested in PROD**; EXT-QA-001 closed | [ ] |

---

## Production smoke test

From repo `web/` (requires network):

```bash
cd web
npm run test:smoke:prod
```

| Check | Expected (env **unset**, current prod) | Expected (env **set** after cutover) |
|-------|----------------------------------------|--------------------------------------|
| `/shoot/game-manual` HTTP status | `< 500` | `< 500` |
| Page heading | Contains “Game manual” | Same |
| Manual link panel | “Official manual link coming soon” | Link labeled **Open game manual** with `target=_blank` |
| Env var leakage | No `NEXT_PUBLIC_GAME_MANUAL_URL` in page HTML | Same |
| Live config sections | “How you earn XP” and/or “Level ladder” visible when Airtable healthy | Same |

Optional evidence: `docs/testing/evidence/` (date-stamped note or screenshot).

---

## Rollback / risk notes

| Risk | Mitigation |
|------|------------|
| Wrong PDF linked publicly | Mike approves URL before set; smoke asserts link label only (not PDF content) |
| Broken Adobe link after season update | Update env + redeploy; config sections remain useful without PDF |
| Accidental iframe embed | Repo never embeds — external open only |

Rollback: clear `NEXT_PUBLIC_GAME_MANUAL_URL` in Vercel and redeploy → page returns to “coming soon” state.

---

## Close-out

After Mike completes steps above:

- [ ] `CHANGELOG.md` — `### Web` entry for SC-109 live attestation
- [ ] `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — SC-109 status
- [ ] `docs/CURRENT-TRUTH.md` — remove “PDF env unset” from pending
- [ ] This doc **Status** → `Promoted to Production`
