# Mike actions — post go-live integration (2026-07-24)

> **Supersedes** earlier “keep 118/119 OFF” guidance in this folder. See [`STALE-CLAIM-CORRECTION.md`](./STALE-CLAIM-CORRECTION.md).

## Verified — do not undo

1. **074** `sendMode` = **Live** (never fixed Test).
2. **118 / 119 schedules ON** (Sun 5:00 / 10:00 AM America/Denver).
3. Make **`Weekly Athlete Summary - Bulk Email - May 18`** **ON**.
4. Do **not** disable 118/119 merely because older audits said OFF.

## Still needed (P1)

5. UI-attest **112 OFF**; **063/111** deleted or OFF (resolve inventory vs attest conflict).
6. Attest **117 XOR 117c** (exactly one `ZOOM_CREDIT|` XP writer).
7. Confirm live script headers: 020 v3.0.0, 054 v5.6, 066 v3.3, 072 v4.0, 074 v2.1, 118/119 v1.4.
8. Re-export Automations operator table including 115–119 / 070c / 116 / 117.
9. Spot-check WAS duplicates (Enrollment+Week) after scheduled 118 runs.
10. Decide Weekly Threshold XP: implement sole writer **or** mark rules unused / Not Needed.

## Explicit non-actions

- Do not force 074 back to Test.
- Do not send broad non-Schmidt parent emails for ad-hoc tests.
- Do not delete fields/tables without migration approval.
