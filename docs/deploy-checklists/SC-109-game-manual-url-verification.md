# SC-109 / EXT-QA-001 — Game Manual URL verification (Vercel env)

| Field | Value |
|-------|--------|
| Date | 2026-08-30 |
| Status | **Promoted to Production** (attested 2026-09-04) |
| Backlog | **SC-109**, **EXT-QA-001** |
| Related | V2-008 game manual · SC-133 pre-season comms (unblocked for URL; editorial copy separate) |
| Public route | `https://www.fairfieldbasketballclub.com/shoot/game-manual` |
| Repo | `Schmidt127/127-si-shooting-challenge` — `web/` Vercel root |
| Evidence | [`docs/testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json`](../testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json) |

## What is already live in Production

The `/shoot/game-manual` route renders **live configuration** from Airtable (no mock data):

| Section | Source | Renders when |
|---------|--------|--------------|
| How you earn XP | `XP Reward Rules` (Active Rules Only view) | Airtable reachable |
| Level ladder | `Levels` table | Airtable reachable |
| Quick start | Static editorial copy in repo | Always |
| Adobe/PDF open link | Repo default `GAME_MANUAL_PUBLISH_URL`, or optional `NEXT_PUBLIC_GAME_MANUAL_URL` override | **Always** (approved Publish Online URL in `web/lib/game-manual/config.ts`) |

When the env override is unset or invalid, the page uses the **baked-in approved Adobe Publish Online URL** — not an error, and never the raw env var name. The legacy “Official manual link coming soon” empty state is reserved only if `getGameManualUrl()` somehow returns null (should not happen while the repo default remains valid).

Repo reference: `web/lib/game-manual/config.ts` · `web/components/game-manual/game-manual-view.tsx`

---

## Vercel project — environment variable (Production)

Open the Vercel project that serves **`/shoot`**.  
**Settings → Environment Variables → Production** (set Preview too if previews should match).

| Variable | Required value | Notes |
|----------|----------------|--------|
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Optional **HTTPS** override | Repo default: `https://indd.adobe.com/view/f3dcc153-0837-461b-9e81-e3fa11558e84` (Adobe Publish Online). Set in Vercel only when overriding the baked-in URL for a future season. |

**Do not log or paste secret values.** This variable is non-secret but should still be the final public document URL only.

### URL acceptance rules (repo)

- Trimmed whitespace only; no iframe embed (Adobe blocks embedding — page opens in a new tab).
- Invalid schemes (e.g. `javascript:`) are rejected; page falls back to the approved repo default.
- Direct S3 or Drive links are **not** used for the manual — Adobe/PDF host only per [`GAME-MANUAL-CONFIG-AUDIT.md`](../overnight/web-integration/GAME-MANUAL-CONFIG-AUDIT.md).

---

## Promotion steps (Mike)

Execute **in order**. No Airtable schema changes in this package.

| # | Action | Done |
|---|--------|------|
| 1 | Confirm the **2026–27 Game Manual** is published at the approved Adobe Publish Online URL | [x] `https://indd.adobe.com/view/f3dcc153-0837-461b-9e81-e3fa11558e84` |
| 2 | (Optional) Vercel → set Production `NEXT_PUBLIC_GAME_MANUAL_URL` only if overriding repo default | [x] Not required — repo default live |
| 3 | (Optional) Set Preview env to the same URL for QA previews | [x] Not required — repo default live |
| 4 | Trigger or wait for Vercel Production deploy from `master` | [x] Live on Production (2026-09-04 HTTP attestation) |
| 5 | Run production smoke (below) | [x] Smoke expects **Open game manual**; HTTP attestation recorded |
| 6 | Visual check: `/shoot/game-manual` shows **Open game manual** → opens Adobe/PDF in new tab | [x] Link + Adobe href present on Production |
| 7 | Confirm live XP rules + level ladder sections still render below the manual panel | [x] “How you earn XP” + “Level ladder” present |
| 8 | Update backlog: SC-109 → **Live Tested in PROD**; EXT-QA-001 closed | [x] 2026-09-04 |

---

## Production smoke test

From repo `web/` (requires network):

```bash
cd web
npm run test:smoke:prod
```

| Check | Expected (current Production) |
|-------|-------------------------------|
| `/shoot/game-manual` HTTP status | `< 500` |
| Page heading | Contains “Game manual” |
| Manual link panel | Link labeled **Open game manual** with `target=_blank` and Adobe Publish Online / Acrobat HTTPS href |
| Env var leakage | No `NEXT_PUBLIC_GAME_MANUAL_URL` in page HTML |
| Live config sections | “How you earn XP” and/or “Level ladder” visible when Airtable healthy |

Optional evidence: `docs/testing/evidence/` (date-stamped note or screenshot). Attestation for this closeout: [`SC-109-PROD-ATTESTATION-2026-09-04.json`](../testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json).

---

## Rollback / risk notes

| Risk | Mitigation |
|------|------------|
| Wrong PDF linked publicly | Mike approves URL before change; smoke asserts Adobe/Acrobat HTTPS link label |
| Broken Adobe link after season update | Update `GAME_MANUAL_PUBLISH_URL` (or optional env) + redeploy; config sections remain useful without PDF |
| Accidental iframe embed | Repo never embeds — external open only |

Rollback: replace `GAME_MANUAL_PUBLISH_URL` (or set a valid `NEXT_PUBLIC_GAME_MANUAL_URL` override) and redeploy. Clearing the env alone does **not** hide the manual — the repo default remains.

---

## Close-out

After Production attestation (2026-09-04):

- [x] `CHANGELOG.md` — `### Web` entry for SC-109 live attestation
- [x] `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — SC-109 status
- [x] `docs/CURRENT-TRUTH.md` — SC-109 no longer listed as deploy-pending
- [x] This doc **Status** → `Promoted to Production`

**Optional follow-ups (not blocking SC-109 close):** Shot Milestones / Perfect Week public config surfaces (schema authorization); SC-133 pre-season parent comms from rules.
