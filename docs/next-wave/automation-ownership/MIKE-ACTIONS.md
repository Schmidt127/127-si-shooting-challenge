# Mike Actions — Agent 9 Automation Ownership

**Priority:** UI attestation before treating ZOOM_CREDIT / VF / WAS schedules as season-safe.

---

## Do now (PROD Airtable UI)

Use checklist: [`AUTOMATION-ATTESTATION-PACKET.md`](./AUTOMATION-ATTESTATION-PACKET.md)

| # | Action | Pass criteria |
|---|--------|---------------|
| 1 | Confirm **112** OFF or Deleted | Must not create Video Feedback |
| 2 | Confirm **013** ON | Version ≈ v2.0; VF key `VIDEO_FEEDBACK\|{asset}` |
| 3 | Confirm **020** ON | Version ≈ **v3.0.0** (GitHub); Grade Band at create |
| 4 | Confirm **063** Deleted/OFF | Do not reinstall |
| 5 | Confirm **111** Deleted/OFF | Do not reinstall |
| 6 | Confirm **031** ON | Primary WAS creator |
| 7 | Confirm **101** ON (live attendance) | Recording path never writes Attendees |
| 8 | Confirm **117 XOR 117c** | Exactly one creates `ZOOM_CREDIT` XP |
| 9 | Confirm **118** OFF | Until weekly schedule authorized |
| 10 | Confirm **119** OFF | Until weekly schedule authorized |
| 11 | Hunt Weekly Threshold XP automation | YES (name/version/key) or NO (missing) |

Paste the exclusivity sign-off block from the attestation packet into your overnight status notes when complete.

---

## Do not

- Re-enable **112**  
- Turn on both **117** and **117c**  
- Reinstall **063** / **111** without a new design  
- Enable **118/119** schedules without race + send authorization  
- Invent a Weekly Threshold writer overnight if UI hunt finds nothing  

---

## Optional follow-ups (after attestation)

| Item | Owner |
|------|-------|
| Decide 020 vs 067 HC product rule (SC-013/014) | ChatGPT / Mike product |
| Decide whether 101 should stop creating WAS | Engineering backlog |
| If Threshold writer missing — schedule rebuild | ChatGPT Phase 2 → Cursor Phase 3 |
| Legacy `HOMEWORK_COMPLETION\|` cleanup via safe-backfill | Mike-authorized dry-run |

---

## DEV

Repeat P0–P1 on DEV `appTetnuCZlCZdTCT`. **115** may be ON in DEV only.
