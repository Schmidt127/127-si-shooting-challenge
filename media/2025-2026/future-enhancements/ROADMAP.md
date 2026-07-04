# Media kit generator — platform roadmap

**Goal:** Make end-of-season publicity a first-class, repeatable platform feature — scalable beyond Montana.

**Backlog ID:** V2-028 · **Target wave:** 10–11 (post close-out, alongside comms hub)

---

## Operator experience (target)

1. Awards finalized; Award Recipients table verified (same bar as 090G / snapshot compare).
2. Admin opens Shooting Challenge ops UI (Airtable extension or `/shoot` admin route).
3. Clicks **Generate Media Kits**.
4. System produces, per configured market/outlet:
   - Newspaper packets (main + short article, editor email, captions, headshots, checklists)
   - Radio media kits + station email drafts
   - Facebook post copy (+ optional image manifest)
   - Season summary stats (homework completions, videos reviewed, shot totals)
5. Operator reviews diff/checklist, downloads zips or sends via Make/Gmail when approved.

No manual CSV export. No paste-from-ChatGPT placeholders in production path.

---

## Architecture (four layers)

| Layer | Responsibility |
|-------|----------------|
| **Data** | Award Recipients, Enrollments, Athletes, Schools, Media Outlets (new config table), Season Settings |
| **Rules** | Outlet clusters, min shots for publicity, caption format, public stat definitions (match final-summary email logic) |
| **Generator** | Python today → Airtable Scripting extension or serverless job reading Airtable API |
| **Presentation** | `media/{season}/` on disk; future: S3 + signed download links (depends on C-013) |

---

## Phased delivery

### Phase A — Consolidate (2025–26 close-out) ✅ in progress

- [x] Top-level `media/` folder per season
- [x] Python builders write to `media/2025-2026/`
- [ ] Document outlet/market config currently hard-coded in `_build_radio_media_kits.py`
- [ ] Extract docx/email templates from inline Python into `templates/`

### Phase B — Config tables (2026–27 pre-season)

- **Media Markets** — slug, title, communities[], linked radio/newspaper outlets
- **Media Outlets** — name, type (newspaper | radio | social), contact email, notes
- **Season Publicity Settings** — min shots, season label, public homework/video counts source fields

Move hard-coded `MARKETS` list and town→cluster CSV logic into Airtable config (Layer 2 per V2 constitution).

### Phase C — Generator service

- Single entrypoint: `generate_media_kits(season_id, channels[], dry_run)`
- Idempotent: skip unchanged packets when source hash matches
- Validation gate: same checks as `compare_award_recipients_snapshot.py` + headshot coverage
- Output manifest JSON (like `radio/BUILD-SUMMARY.json`) for audit trail

### Phase D — UI + distribution

- **Generate Media Kits** button with channel checkboxes
- Preview checklist (missing headshots, ambiguous town, duplicate athletes)
- Optional Make scenario: editor email with zip attachment after human approval
- Public-facing: none of this is participant UI — ops/admin only

---

## Dependencies

| Item | Why |
|------|-----|
| **C-013** S3 canonical URLs | Stable headshot URLs for regeneration |
| **C-022** public display fields | Consistent names/grades in captions |
| **Wave 0 close-out** | Final stat definitions locked (122 HW / 129 video reviewed) |
| **C-012** schema ownership | Room for Media Markets / Outlets tables |

---

## Success metrics

- Time from “awards finalized” to “all packets send-ready” < 1 day with one operator
- Zero athletes with 10+ shots missing from newspaper or radio assignment
- New state/region onboarding = add config rows, not fork Python scripts

---

## References

- [../README.md](../README.md) — 2025–26 deliverable status
- [../../../docs/v2-change-backlog.md](../../../docs/v2-change-backlog.md) — V2-028
- [../../../tools/airtable/media_paths.py](../../../tools/airtable/media_paths.py) — path constants
- [../../../tools/airtable/_build_town_packet.py](../../../tools/airtable/_build_town_packet.py) — newspaper packet builder
- [../../../tools/airtable/_build_radio_media_kits.py](../../../tools/airtable/_build_radio_media_kits.py) — radio kit builder
