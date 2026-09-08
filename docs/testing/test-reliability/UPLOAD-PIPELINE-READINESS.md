# Legacy Upload Pipeline — Wave B11 Readiness

**Agent 6 scope** | **NO-TOUCH:** PR #486, 070a/070b edits

## Testable on master (legacy path)

| Step | Component | Offline proof |
|------|-----------|---------------|
| 1 | 009 asset intake | Contract tests |
| 2 | 020 HC / 013 VF | Homework architecture tests |
| 3 | 070a/070b → Make → Lambda | `upload-make-lambda-response.test.js`, SC-008 pack |
| 4 | 070c verify + trigger clear | SC-008 pack |
| 5 | 022 child writeback | `022-child-upload-writeback.test.js` |
| 6 | SC-150 reviewer URL | Lambda viewer tests (env: boto3 + PYTHONPATH) |

## Blocked

| Path | Reason |
|------|--------|
| Structured Curriculum upload-staging | PR #486 not merged |
| 070a HC-without-Submission | PR #486 gate relaxation |

Mark matrix row **C8** as `BLOCKED_BY_SC_STRUCTURED_HOMEWORK_FILES_001`.

## Success contract fields (Submission Assets)

Upload Status=Uploaded, Send to Make Trigger off, Upload Error blank, Canonical File URL, Storage Key, Uploaded At, SHA-256, Reviewer Access Token, Reviewer File URL — validated by `evaluateFinalUploadSuccessContract`.
