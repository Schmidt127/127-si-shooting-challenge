# Mike Actions — Agent 5 (precise / minimal)

Only UI checks that still change risk. Full consolidated queue: [`../final-reconciliation/MIKE-ACTIONS-NEXT.md`](../final-reconciliation/MIKE-ACTIONS-NEXT.md).

## P0 — exact verifications

1. **074** inputs: `sendMode` = **Live** (or blank + WAS Live). Not fixed Test.  
2. **118 / 119**: schedules still **ON**; record current `dryRun` and `includeSchmidt` values.  
3. Make **`Weekly Athlete Summary - Bulk Email - May 18`** still **ON**.  
4. **112 OFF**; **117 XOR 117c** for any `ZOOM_CREDIT|` XP minting.  
5. First Sunday 5 AM / 10 AM Denver watch (WAS → build → arm → send → Sent?).

## P1

6. Script header attestation: 020 v3.0.0, 054 v5.6, 066 v3.3, 072 v4.0, 074 v2.1, 118/119 v1.4.  
7. Attest Make Live writeback field list vs dual WAS timestamp fields (Agent 2).  
8. Decide Weekly Threshold XP: implement writer or mark unused.

## Do not

- Disable 118/119 because an old doc said OFF  
- Force 074 to Test  
- Add Team Shot Tracker inactivity alerts  
- Collapse Config years / reinstall full 063/111 / create a new Make WAS sender  
