# Curriculum & Media Content Inventory

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Mode:** Repository evidence only — no new curriculum content written  
**Supports:** SC-052/053 consolidation context; content-only notes for SC-054, SC-127–SC-132

## Method

Inventory categories requested by the mission against:

- Airtable schema snapshots
- `web/` catalog queries/routes
- `docs/` backlog + project state
- `media/` publicity kits
- Absence of automation references to Tutorials tables

Statuses:

| Status | Meaning |
|--------|---------|
| **Exists** | Concrete table/route/assets in repo or schema |
| **Referenced but missing** | Docs/backlog reference without implemented content surface |
| **Duplicate reference** | Two tables/paths describing same job |
| **Obsolete reference** | Legacy naming or retired path still mentioned |
| **Media readiness** | Attachments/URLs/patterns ready enough for public use |
| **Public readiness** | Safe to show on `/shoot` without Presentation/schema work |

## Category inventory

### 1. Shooting drills

| Attribute | Finding |
|-----------|---------|
| Exists | `Tutorials` categories include `Shoot`, `Freethrow`; web `/tutorials` |
| Duplicate reference | `Tutorials & Assets` overlaps purpose |
| Media readiness | Depends on live `Link to Video` + thumbnails (UNKNOWN row quality) |
| Public readiness | **Partial** — routes live; content quality unverified on live rows |
| Notes | Keep table is canonical |

### 2. Ball-handling

| Attribute | Finding |
|-----------|---------|
| Exists | `Tutorials` category `Dribble`; `Associated Program` includes `Dribbling Challenge` |
| Referenced but missing | Dedicated dribbling public site is out of this repo |
| Public readiness | SC web filter prefers Shooting Challenge program; dribble-tagged SC rows can still appear |
| Notes | Orphan table also has Dribbling Challenge program option |

### 3. Homework

| Attribute | Finding |
|-----------|---------|
| Exists | `FBC Curriculum - SYNC` (29 fields); web homework catalog; automations 063/065/067/070/071 |
| Duplicate reference | Docs warn against `ZZZ LEGACY - Homework` links |
| Media readiness | Cover images, Docs attachments, URL fields exist |
| Public readiness | **Installed in PROD** for catalog (SC-104) with `Published?` |
| Link to Tutorials | **None** in schema (`Tutorials` link fields = 0) |

### 4. Educational athletics / character

| Attribute | Finding |
|-----------|---------|
| Exists | Tutorials category `Character`; curriculum books (`Character 33`, `Playing in the Box`, `Mental Toughness…`); FBC Article Book tutorial type |
| Public readiness | Articles route `/articles` reads Tutorials type filter |
| Notes | Strong overlap between curriculum topics and tutorial character/article content — conceptual, not linked records |

### 5. Goal setting

| Attribute | Finding |
|-----------|---------|
| Exists | Challenge goals / Target Goal Shots (schema + automations elsewhere); curriculum topics include Personal Game Plan |
| Referenced but missing | No Tutorials-specific goal-setting catalog |
| Public readiness | Not a Tutorials merge blocker |

### 6. Video feedback

| Attribute | Finding |
|-----------|---------|
| Exists | `Video Feedback` table + automations 013/073/111/114; Submission Assets pipeline |
| Duplicate/obsolete | 112 expected OFF (legacy duplicate of 013) |
| Relation to Tutorials | **None** for merge |
| Public readiness | Athlete-facing feedback is private workflow, not Tutorials catalog |

### 7. Zoom resources

| Attribute | Finding |
|-----------|---------|
| Exists | `Zoom Meetings` table; web Zoom queries/view |
| Relation to Tutorials | Separate table |
| Public readiness | Separate from Tutorials merge |

### 8. Achievements / game manual

| Attribute | Finding |
|-----------|---------|
| Exists | `Achievements` web catalog; game manual route + recent config audit docs under overnight/web-integration |
| Referenced but missing | Game manual fully generated from config still planned (SC-109) |
| Content-only SC-127–129 | Awards metadata/dedupe deferred — **not Tutorials tables** |
| Public readiness | Achievements catalog live; game manual content completeness UNKNOWN |

### 9. Preseason resources

| Attribute | Finding |
|-----------|---------|
| Exists | Docs for Week 0 / game-manual-first comms (V2-008–V2-010, SC-133) |
| Referenced but missing | No dedicated Preseason Tutorials category/table in schema |
| Public readiness | Not ready as a Tutorials feed |

### 10. Parent resources

| Attribute | Finding |
|-----------|---------|
| Exists | Parent emails (Make), Presentation field plans (C-022), media kits for towns/radio |
| Gap | Tutorials lack `Parent Description` Presentation field (spec only) |
| Public readiness | Parent-safe tutorial copy not guaranteed |

### 11. Coach resources

| Attribute | Finding |
|-----------|---------|
| Exists | Mentions in docs / media award articles; no Coach Resources table tied to Tutorials |
| Referenced but missing | Dedicated coach resource catalog |
| Public readiness | Not in `/shoot` tutorials |

## Duplicate / obsolete reference matrix

| Item | Classification | Action in merge |
|------|----------------|-----------------|
| `Tutorials` vs `Tutorials & Assets` | **Duplicate table reference** | Keep Tutorials; migrate then decide delete |
| Softr publish field name | **Obsolete naming** (product still uses field) | Keep until SC-144 |
| `ZZZ LEGACY - Homework` | **Obsolete** curriculum path | Do not relink |
| Automation 112 | **Obsolete** video feedback path | Unrelated; keep OFF |
| `Informational` asset type | Orphan-only option | Unmapped to Tutorials |

## Media readiness (tutorials)

| Check | Repo evidence | Live status |
|-------|---------------|-------------|
| URL field on keep table | `Link to Video` type `url` | UNKNOWN rows |
| URL field on orphan | multilineText (weaker) | UNKNOWN rows |
| Thumbnails / display images | Attachments both tables | UNKNOWN freshness |
| Public image preference | Web uses `Website Image Resolved` then `Thumbnail` | Mapping accounts for this |
| Private data in athlete fields | Orphan Athlete single-select of real names | Review before publish |

## Public readiness summary

| Content class | Public-ready now? | Blocker |
|---------------|-------------------|---------|
| Tutorials keep-table pipeline | Routes yes; content unknown | Live export + quality audit |
| Tutorials & Assets | **No** | Not queried; schema weaker; Softr unknown |
| Homework curriculum | Mostly | Presentation polish (SC-054) |
| Media kits (SC-130) | Complete for 2025–26 manual send | Platform feature SC-131 deferred |
| Facebook kits (SC-132) | Not started | Deferred product decision |
| Awards content (SC-127–129) | Deferred unrelated cleanup | Not part of Tutorials merge |

## SC-127–SC-132 content-only support notes

| SC | Content relevance to this package |
|----|-----------------------------------|
| SC-127 | Award Recipients metadata — **no Tutorials dependency** found |
| SC-128 | Awards catalog duplicate bucket — **no Tutorials dependency** |
| SC-129 | Conquered Goal Date lookup — **no Tutorials dependency** |
| SC-130 | Newspaper/radio kits complete historically — separate from Tutorials table |
| SC-131 | Platform media kit generation — may later reuse Presentation labels; not merge blocker |
| SC-132 | Facebook kits optional — no Tutorials table dependency |

## Gaps to close before claiming curriculum consolidation complete

1. Fresh row export for both Tutorials tables.  
2. Duplicate/orphan/quality reports on real data.  
3. Softr/Interface proof for orphan table.  
4. Operator decisions in `MIKE-DECISIONS.md`.  
5. Presentation field creation (later; not required to finish SC-052 analysis).
